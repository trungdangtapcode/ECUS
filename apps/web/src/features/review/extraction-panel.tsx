import { useState } from "react";
import { useFieldLabel } from "./field-label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { read, reviewKey } from "./queries";

export function ExtractionPanel({
  caseId,
  data,
  documentId,
}: {
  caseId: string;
  data: ReviewWorkspace;
  documentId?: string;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const label = useFieldLabel(data);
  const [scope, setScope] = useState("");
  const fields = data.workspace.policy?.fields ?? [];
  const grouped = new Map<string, typeof fields>();
  for (const field of fields) {
    const repeated = /^(goods_\d{3})_/.exec(field.field);
    const key = repeated?.[1] ?? (field.field.startsWith("containers_") ? "containers" : "general");
    grouped.set(key, [...(grouped.get(key) ?? []), field]);
  }
  const scopes = [...grouped].flatMap(([key, items]) => {
    const batches = [];
    for (let index = 0; index < items.length; index += 50) {
      batches.push({
        key: `${key}:${index}`,
        fields: items.slice(index, index + 50),
        label:
          key === "general"
            ? t("integration.aiGeneral")
            : key === "containers"
              ? t("integration.groups.containers")
              : label(items[0]!.field).split(" · ")[0],
        from: index + 1,
        to: Math.min(index + 50, items.length),
      });
    }
    return batches;
  });
  const selectedScope = scopes.find((item) => item.key === scope) ?? scopes[0];
  const path = { case_id: caseId };
  const queryKey = ["review-extractions", caseId];
  const runs = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await api.GET("/api/v1/cases/{case_id}/review/extractions", {
        params: { path },
      });
      if (!result.data || result.error) throw new ApiError(result.error);
      return result.data;
    },
    refetchInterval: (query) =>
      query.state.data?.some((item) => ["pending", "running"].includes(item.status)) ? 1500 : false,
  });
  const start = useMutation({
    mutationFn: async () => {
      if (!documentId) return;
      const result = await api.POST("/api/v1/cases/{case_id}/review/extractions", {
        params: { path },
        body: {
          revision: data.workspace.revision,
          document_id: documentId,
          fields: selectedScope?.fields ?? [],
        },
      });
      if (result.error) throw new ApiError(result.error);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  const apply = useMutation({
    mutationFn: async (job_id: string) =>
      read(
        await api.POST("/api/v1/cases/{case_id}/review/extractions/{job_id}/apply", {
          params: { path: { ...path, job_id } },
          body: { revision: data.workspace.revision },
        }),
      ),
    onSuccess: (result) => cache.setQueryData(reviewKey(caseId), result),
  });
  const retry = useMutation({
    mutationFn: async (job_id: string) => {
      const result = await api.POST("/api/v1/cases/{case_id}/review/extractions/{job_id}/retry", {
        params: { path: { ...path, job_id } },
        body: { revision: data.workspace.revision },
      });
      if (result.error) throw new ApiError(result.error);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  const running = runs.data?.some((item) => ["pending", "running"].includes(item.status));
  return (
    <details className="review-comparison">
      <summary>{t("extraction.title")}</summary>
      <p>{t("integration.aiNotice")}</p>
      {!!scopes.length && (
        <label className="review-ai-scope">
          {t("integration.aiScope")}
          <select
            value={selectedScope?.key ?? ""}
            onChange={(event) => setScope(event.target.value)}
          >
            {scopes.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} · {t("integration.aiBatch", { from: item.from, to: item.to })}
              </option>
            ))}
          </select>
        </label>
      )}
      {!data.workspace.policy?.fields?.length && <p>{t("extraction.configure")}</p>}
      {[runs.error, start.error, apply.error, retry.error].filter(Boolean).map((error, index) => (
        <ErrorState key={index} error={error} />
      ))}
      <Button
        disabled={!documentId || !selectedScope || start.isPending || retry.isPending || !!running}
        onClick={() => start.mutate()}
      >
        {t("extraction.start")}
      </Button>
      {(runs.data ?? []).map((run) => {
        const applied = run.applied || data.workspace.applied_extractions?.includes(run.id);
        const stale = run.source_revision !== data.workspace.revision;
        return (
          <article key={run.id} className="review-export-record">
            <strong>
              {data.workspace.documents?.find((doc) => doc.id === run.document_id)?.filename} ·{" "}
              {t(`extraction.status.${run.status}`)}
            </strong>
            <p>
              {t("extraction.counts", {
                accepted: run.accepted_count,
                rejected: run.rejected_count,
              })}
            </p>
            {run.model && (
              <small>
                {run.model} · {run.prompt_version}
              </small>
            )}
            {run.error_code && (
              <p role="alert">
                {t(`errors.${run.error_code}`, { defaultValue: t("common.unknownError") })}
              </p>
            )}
            {!applied &&
              !running &&
              (["failed", "interrupted"].includes(run.status) ||
                (run.status === "succeeded" && stale)) && (
                <Button
                  variant="secondary"
                  disabled={retry.isPending || start.isPending}
                  onClick={() => retry.mutate(run.id)}
                >
                  {t("integration.retryExtraction")}
                </Button>
              )}
            {run.status === "succeeded" && (
              <>
                <p>
                  {t(
                    applied
                      ? "extraction.applied"
                      : stale
                        ? "extraction.stale"
                        : "extraction.review",
                  )}
                </p>
                <Button
                  disabled={applied || stale || !run.accepted_count || apply.isPending}
                  onClick={() => apply.mutate(run.id)}
                >
                  {t("extraction.import")}
                </Button>
              </>
            )}
          </article>
        );
      })}
    </details>
  );
}
