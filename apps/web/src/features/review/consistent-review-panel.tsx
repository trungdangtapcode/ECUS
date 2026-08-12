import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { CheckCheck, ArrowUpRight } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { useFieldLabel } from "./field-label";
import { read, reviewKey } from "./queries";

type Source = ReviewWorkspace["readiness"]["comparisons"][number]["observations"][number];

export function ConsistentReviewPanel({
  caseId,
  data,
  openSource,
}: {
  caseId: string;
  data: ReviewWorkspace;
  openSource: (source: Source) => void;
}) {
  const { t } = useTranslation();
  const label = useFieldLabel(data);
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const candidates = data.readiness.comparisons.filter(
    (item) => item.consistent && !item.resolved && !item.canonical,
  );
  const chosen = selected.filter((field) => candidates.some((item) => item.field === field));
  const mutation = useMutation({
    mutationFn: async () =>
      read(
        await api.POST("/api/v1/cases/{case_id}/review/confirm-fields", {
          params: { path: { case_id: caseId } },
          body: { revision: data.workspace.revision, fields: chosen, reason },
        }),
      ),
    onSuccess: (result) => {
      cache.setQueryData(reviewKey(caseId), result);
      setSelected([]);
      setReason("");
    },
  });
  if (!candidates.length) return null;
  return (
    <details className="consistent-review-panel" open>
      <summary>
        <CheckCheck size={18} />
        {t("processing.consistentTitle", { count: candidates.length })}
      </summary>
      <p>{t("processing.consistentNotice")}</p>
      <label className="review-checkbox">
        <input
          type="checkbox"
          checked={chosen.length === candidates.length}
          onChange={(event) =>
            setSelected(event.target.checked ? candidates.map((item) => item.field) : [])
          }
        />
        {t("processing.selectVisible")}
      </label>
      <div className="consistent-source-list">
        {candidates.map((item) => (
          <article key={item.field}>
            <label className="review-checkbox">
              <input
                type="checkbox"
                checked={chosen.includes(item.field)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, item.field]
                      : current.filter((field) => field !== item.field),
                  )
                }
              />
              {label(item.field)}
            </label>
            <strong>
              {item.observations[0]?.normalized} {item.observations[0]?.unit}
            </strong>
            <div>
              {item.observations.map((source) => (
                <button key={source.id} onClick={() => openSource(source)}>
                  {source.document_type} · {t("review.page")} {source.page} · {source.quote}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <label className="review-form">
        {t("review.reason")}
        <input
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {mutation.error && <ErrorState error={mutation.error} />}
      <Button
        disabled={mutation.isPending || !chosen.length || !reason.trim()}
        onClick={() => mutation.mutate()}
      >
        {t("processing.confirmSelected", { count: chosen.length })}
      </Button>
    </details>
  );
}
