import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError, type ReviewWorkspace } from "@ecus/api-client";
import { Braces, Download, FileSearch } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { useFieldLabel } from "./field-label";

export function AITracePanel({
  caseId,
  data,
  active = false,
}: {
  caseId: string;
  data: ReviewWorkspace;
  active?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const fieldLabel = useFieldLabel(data);
  const documentName = (id: string | null) =>
    data.workspace.documents?.find((item) => item.id === id)?.filename;
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const limit = 10;
  const calls = useQuery({
    queryKey: ["ai-calls", caseId, offset],
    enabled: open,
    queryFn: async () => {
      const result = await api.GET("/api/v1/cases/{case_id}/review/ai-traces", {
        params: { path: { case_id: caseId }, query: { limit, offset } },
      });
      if (result.error || !result.data) throw new ApiError(result.error);
      return result.data;
    },
    refetchInterval: (query) =>
      active || query.state.data?.items.some((item) => item.status === "running") ? 1500 : false,
  });
  const selectedStatus = calls.data?.items.find((call) => call.id === selected)?.status;
  const detail = useQuery({
    queryKey: ["ai-call", caseId, selected, selectedStatus],
    refetchInterval: selectedStatus === "running" ? 1500 : false,
    enabled: open && !!selected,
    queryFn: async () => {
      const result = await api.GET("/api/v1/cases/{case_id}/review/ai-traces/{trace_id}/content", {
        params: { path: { case_id: caseId, trace_id: selected! } },
        parseAs: "text",
      });
      if (result.error || typeof result.data !== "string") throw new ApiError(result.error);
      return JSON.parse(result.data) as { request: unknown; response: unknown; summary: unknown };
    },
  });
  return (
    <details
      className="ai-trace-panel"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <FileSearch size={17} aria-hidden="true" />
        {t("aiTrace.title")}
      </summary>
      {open && (
        <div className="ai-trace-body">
          <p className="review-hint ai-trace-description">{t("aiTrace.description")}</p>
          {calls.error && <ErrorState error={calls.error} />}
          {calls.isPending && <p role="status">{t("common.loading")}</p>}
          {calls.data && !calls.data.enabled && <p>{t("aiTrace.disabled")}</p>}
          {calls.data?.enabled && !calls.data.total && <p>{t("aiTrace.empty")}</p>}
          {calls.data?.items.map((call) => {
            const validation = call.validation ?? [];
            const counts = {
              accepted: validation.filter((item) => item.status === "accepted").length,
              rejected: validation.filter((item) => item.status === "rejected").length,
              notProposed: validation.filter((item) => item.status === "not_proposed").length,
            };
            return (
              <article className="ai-trace-call" key={call.id}>
                <div className="ai-trace-heading">
                  <div>
                    <strong>{call.model}</strong>
                    {documentName(call.document_id) && (
                      <span className="ai-trace-document">{documentName(call.document_id)}</span>
                    )}
                    <span>
                      {t(`aiTrace.phases.${call.phase}`, { defaultValue: call.phase })} ·{" "}
                      {t(`aiTrace.status.${call.status}`)}
                    </span>
                  </div>
                  <time dateTime={call.at}>
                    {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                      dateStyle: "short",
                      timeStyle: "medium",
                    }).format(new Date(call.at))}
                  </time>
                </div>
                <p className="ai-trace-input">
                  {t(
                    call.phase === "reconciliation"
                      ? "aiTrace.semanticInputSummary"
                      : "aiTrace.inputSummary",
                    {
                      fields: call.fields.length,
                      pages: call.pages.join(", "),
                      images: call.image_count,
                    },
                  )}{" "}
                  · {(call.duration_ms / 1000).toFixed(1)}s · HTTP {call.http_status ?? "—"}
                </p>
                {call.provider_request_id && <code>{call.provider_request_id}</code>}
                {call.error_code && (
                  <p role="alert">
                    {t(`errors.${call.error_code}`, { defaultValue: t("common.unknownError") })}
                  </p>
                )}
                {!!validation.length && (
                  <details className="ai-trace-results">
                    <summary>
                      <span>{t("aiTrace.validationDetails", { count: validation.length })}</span>
                      <span className="ai-trace-outcomes">
                        <span>{t("aiTrace.acceptedCount", { count: counts.accepted })}</span>
                        <span>{t("aiTrace.rejectedCount", { count: counts.rejected })}</span>
                        <span>{t("aiTrace.notProposedCount", { count: counts.notProposed })}</span>
                      </span>
                    </summary>
                    <ul
                      className="ai-trace-validation"
                      tabIndex={0}
                      aria-label={t("aiTrace.validationDetails", { count: validation.length })}
                    >
                      {validation.map((item, index) => (
                        <li key={index} data-status={item.status}>
                          <div className="ai-trace-field">
                            <strong>
                              {item.field ? fieldLabel(item.field) : (item.document_type ?? "—")}
                            </strong>
                            {item.field && <code>{item.field}</code>}
                          </div>
                          <span className="ai-trace-field-result">
                            {t(`aiTrace.validation.${item.status}`, { defaultValue: item.status })}
                            {item.normalized && <strong>{item.normalized}</strong>}
                            {item.error_code && <code>{item.error_code}</code>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="review-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setSelected(selected === call.id ? null : call.id)}
                  >
                    <Braces size={15} />
                    {t("aiTrace.inspect")}
                  </Button>
                  <a
                    className="ai-trace-download"
                    href={`/api/v1/cases/${caseId}/review/ai-traces/${call.id}/content`}
                    download
                  >
                    <Download size={15} />
                    {t("aiTrace.download")}
                  </a>
                </div>
                {selected === call.id && (
                  <div className="ai-trace-detail">
                    {detail.error && <ErrorState error={detail.error} />}
                    {detail.isPending && <p role="status">{t("common.loading")}</p>}
                    {detail.data && (
                      <>
                        <h3>{t("aiTrace.request")}</h3>
                        <pre tabIndex={0}>{JSON.stringify(detail.data.request, null, 2)}</pre>
                        <h3>{t("aiTrace.response")}</h3>
                        <pre tabIndex={0}>{JSON.stringify(detail.data.response, null, 2)}</pre>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {calls.data && calls.data.total > limit && (
            <nav className="canonical-pagination" aria-label={t("aiTrace.title")}>
              <span>{t("aiTrace.count", { count: calls.data.total })}</span>
              <Button
                variant="secondary"
                disabled={offset === 0}
                onClick={() => {
                  setOffset(Math.max(0, offset - limit));
                  setSelected(null);
                }}
              >
                {t("common.previous")}
              </Button>
              <Button
                variant="secondary"
                disabled={offset + limit >= calls.data.total}
                onClick={() => {
                  setOffset(offset + limit);
                  setSelected(null);
                }}
              >
                {t("common.next")}
              </Button>
            </nav>
          )}
        </div>
      )}
    </details>
  );
}
