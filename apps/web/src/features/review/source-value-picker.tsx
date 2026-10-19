import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { read, reviewKey } from "./queries";
import { useMotionRecipe } from "../../design/motion-hooks";

type Comparison = ReviewWorkspace["readiness"]["comparisons"][number];
type Observation = Comparison["observations"][number];

export function SourceValuePicker({
  caseId,
  data,
  item,
  viewedSourceId,
  onPreview,
  onSaved,
}: {
  caseId: string;
  data: ReviewWorkspace;
  item: Comparison;
  viewedSourceId?: string;
  onPreview: (source: Observation) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const effects = useMotionRecipe();
  if (
    !item.observations.length ||
    !data.workspace.template?.mappings.some((mapping) => mapping.field === item.field)
  )
    return null;
  const source = item.observations.find((entry) => entry.id === viewedSourceId);
  const document = data.workspace.documents?.find((entry) => entry.id === source?.document_id);
  const saved = source?.id === item.canonical?.source_observation_id && !item.canonical_stale;
  return (
    <section className="source-value-picker" aria-label={t("review.quickSourceValue")}>
      <h4>{t("review.quickSourceValue")}</h4>
      <div className="source-picker-options" role="group" aria-label={t("review.sourceValues")}>
        {item.observations.map((entry) => {
          const filename = data.workspace.documents?.find(
            (document) => document.id === entry.document_id,
          )?.filename;
          const value = `${entry.normalized} ${entry.unit}`.trim();
          return (
            <motion.button
              type="button"
              key={entry.id}
              aria-pressed={entry.id === source?.id}
              aria-label={t("review.sourceChoice", { value, file: filename, page: entry.page })}
              onClick={() => onPreview(entry)}
              whileHover={effects.hoverInset}
              whileTap={effects.press}
            >
              <strong title={value}>{value}</strong>
              <small title={filename}>
                {filename} · {t("review.page")} {entry.page}
              </small>
            </motion.button>
          );
        })}
      </div>
      <p className="source-picker-caption">{t("review.sourceCandidateValue")}</p>
      <output className="source-picker-preview" aria-label={t("review.sourceCandidateValue")}>
        {source ? `${source.normalized} ${source.unit}`.trim() : t("review.chooseSourceToFill")}
      </output>
      {source && document && (
        <>
          <small className="source-picker-filename">
            {document.filename} · {t("review.page")} {source.page}
          </small>
          <p className="source-picker-caption">
            {t(saved ? "review.sourceValueSaved" : "review.sourceValueNotSaved")}
          </p>
          {!confirming && (
            <Button variant="secondary" disabled={saved} onClick={() => setConfirming(true)}>
              {saved && <Check size={15} aria-hidden="true" />}
              {t(saved ? "review.sourceValueSaved" : "review.useViewedValue")}
            </Button>
          )}
          {confirming && !saved && (
            <SourceChoiceForm
              key={source.id}
              caseId={caseId}
              data={data}
              source={source}
              filename={document.filename}
              onCancel={() => setConfirming(false)}
              onSaved={() => {
                setConfirming(false);
                onSaved();
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

function SourceChoiceForm({
  caseId,
  data,
  source,
  filename,
  onCancel,
  onSaved,
}: {
  caseId: string;
  data: ReviewWorkspace;
  source: Observation;
  filename: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [reason, setReason] = useState(() =>
    t("review.sourceValueReason", {
      file: filename,
      page: source.page,
    }),
  );
  const [reviewed, setReviewed] = useState(false);
  const mutation = useMutation({
    mutationFn: async () =>
      read(
        await api.POST("/api/v1/cases/{case_id}/review/fields/{field}/canonical", {
          params: { path: { case_id: caseId, field: source.field } },
          body: {
            revision: data.workspace.revision,
            value: source.normalized,
            source_observation_id: source.id,
            number_locale: "en",
            reason,
            reviewed,
          },
        }),
      ),
    onSuccess: (result) => {
      cache.setQueryData(reviewKey(caseId), result);
      onSaved();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <form className="source-choice-form review-form" onSubmit={submit}>
      <label>
        {t("integration.editReason")}
        <textarea
          aria-label={t("integration.editReason")}
          required
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <label className="review-checkbox">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        {t("processing.confirmEdit")}
      </label>
      {mutation.error && <ErrorState error={mutation.error} />}
      <div className="review-actions">
        <Button type="submit" disabled={mutation.isPending || !reviewed || !reason.trim()}>
          {t("integration.saveValue")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
