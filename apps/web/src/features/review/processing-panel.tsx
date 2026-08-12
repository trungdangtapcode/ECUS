import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, LoaderCircle, ScanLine } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { AITracePanel } from "./ai-trace-panel";
import { read, reviewKey } from "./queries";

export function ProcessingPanel({
  caseId,
  data,
  onReview,
}: {
  caseId: string;
  data: ReviewWorkspace;
  onReview: () => void;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [primaryInvoice, setPrimaryInvoice] = useState("");
  const path = { case_id: caseId };
  const queryKey = ["document-set-processing", caseId];
  const runs = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await api.GET("/api/v1/cases/{case_id}/review/processing", {
        params: { path },
      });
      if (result.error || !result.data) throw new ApiError(result.error);
      return result.data;
    },
    refetchInterval: (query) =>
      query.state.data?.some((run) => ["pending", "running"].includes(run.status)) ? 1500 : false,
  });
  const capabilities = useQuery({
    queryKey: ["processing-capabilities", caseId],
    queryFn: async () => {
      const result = await api.GET("/api/v1/cases/{case_id}/review/processing-capabilities", {
        params: { path },
      });
      if (!result.data || result.error) throw new ApiError(result.error);
      return result.data;
    },
  });
  const latest = runs.data?.[0];
  const active = runs.data?.find((run) => ["pending", "running"].includes(run.status));
  const start = useMutation({
    mutationFn: async () => {
      const result = await api.POST("/api/v1/cases/{case_id}/review/processing", {
        params: { path },
        body: { revision: data.workspace.revision, primary_invoice_id: primaryInvoice || null },
      });
      if (result.error || !result.data) throw new ApiError(result.error);
      return result.data;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  const verify = useMutation({
    mutationFn: async (logical_id: string) =>
      read(
        await api.POST("/api/v1/cases/{case_id}/review/logical-documents/{logical_id}/verify", {
          params: { path: { ...path, logical_id } },
          body: { revision: data.workspace.revision, reason: t("processing.classificationReason") },
        }),
      ),
    onSuccess: (result) => cache.setQueryData(reviewKey(caseId), result),
  });
  const latestId = latest?.id;
  const latestStatus = latest?.status;
  useEffect(() => {
    if (latestId && latestStatus && ["succeeded", "failed", "interrupted"].includes(latestStatus)) {
      void cache.invalidateQueries({ queryKey: reviewKey(caseId) });
    }
  }, [cache, caseId, latestId, latestStatus]);
  const documents = (data.workspace.documents ?? []).filter((doc) => !doc.withdrawn);
  const progress = active?.progress;
  const percent = progress?.total ? Math.round((100 * progress.completed) / progress.total) : 0;
  return (
    <section
      className={`processing-panel ${active ? "is-processing" : ""}`}
      aria-label={t("processing.title")}
    >
      <div className="processing-heading">
        <ScanLine size={25} aria-hidden="true" />
        <div>
          <h2>{t("processing.title")}</h2>
          <p>{t("processing.description")}</p>
        </div>
        <span className="processing-count">
          {t("processing.documentCount", { count: documents.length })}
        </span>
      </div>
      <ol className="processing-stages">
        {["read", "classify", "compare", "export"].map((stage, index) => (
          <li key={stage}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {t(`processing.stages.${stage}`)}
          </li>
        ))}
      </ol>
      {[runs.error, capabilities.error, start.error, verify.error]
        .filter(Boolean)
        .map((error, index) => (
          <ErrorState key={index} error={error} />
        ))}
      {!active && documents.length > 1 && (
        <label className="processing-primary-invoice review-form">
          {t("processing.primaryInvoice")}
          <select
            value={primaryInvoice}
            onChange={(event) => setPrimaryInvoice(event.target.value)}
          >
            <option value="">{t("processing.automaticInvoice")}</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.filename}
              </option>
            ))}
          </select>
        </label>
      )}
      {active ? (
        <div role="status" aria-live="polite" className="processing-progress">
          <LoaderCircle size={17} className="processing-spinner" />
          <span>
            {t(`processing.phases.${progress?.phase ?? "queued"}`)} · {percent}%
          </span>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("processing.title")}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <small>{documents.find((doc) => doc.id === progress?.document_id)?.filename}</small>
        </div>
      ) : (
        <div className="review-actions">
          <Button
            disabled={
              start.isPending ||
              !documents.length ||
              !data.workspace.template ||
              !capabilities.data?.ai_configured
            }
            onClick={() => start.mutate()}
          >
            <ScanLine size={17} />
            {t(latest ? "processing.runAgain" : "processing.start")}
          </Button>
          {latest?.status === "succeeded" && (
            <Button variant="secondary" onClick={onReview}>
              {t("processing.reviewResults")}
              <ArrowRight size={15} />
            </Button>
          )}
        </div>
      )}
      {!data.workspace.template && <p className="review-hint">{t("processing.chooseTemplate")}</p>}
      {latest?.status === "succeeded" && (
        <p className="processing-result">
          {t("processing.result", {
            accepted: latest.accepted_count,
            rejected: latest.rejected_count,
            ocr: latest.ocr_count,
          })}
        </p>
      )}
      {latest?.error_code && (
        <p role="alert">
          {t(`errors.${latest.error_code}`, { defaultValue: t("common.unknownError") })}
        </p>
      )}
      {!!data.workspace.logical_documents?.filter((item) => !item.withdrawn).length && (
        <details className="processing-classifications" open>
          <summary>{t("processing.classifications")}</summary>
          {data.workspace.logical_documents
            .filter((item) => !item.withdrawn)
            .map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.document_type}</strong>
                  <small>
                    {documents.find((doc) => doc.id === item.document_id)?.filename} ·{" "}
                    {t("processing.pageRange", { from: item.page_from, to: item.page_to })}
                  </small>
                </div>
                {item.verified ? (
                  <span className="processing-confirmed">
                    <Check size={14} />
                    {t("processing.confirmed")}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={verify.isPending || !!active}
                    onClick={() => verify.mutate(item.id)}
                  >
                    {t("processing.confirmClassification")}
                  </Button>
                )}
              </article>
            ))}
        </details>
      )}
      <AITracePanel caseId={caseId} data={data} active={!!active} />
    </section>
  );
}
