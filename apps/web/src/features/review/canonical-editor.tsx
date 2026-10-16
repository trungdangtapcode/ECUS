import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Pencil, RotateCcw } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { read, reviewKey } from "./queries";
import { useFieldLabel } from "./field-label";

type Comparison = ReviewWorkspace["readiness"]["comparisons"][number];
type Observation = Comparison["observations"][number];

export function CanonicalEditor({
  caseId,
  data,
  item,
  index,
  openSource,
  onSaved,
  hidden = false,
}: {
  caseId: string;
  data: ReviewWorkspace;
  item: Comparison;
  index: number;
  openSource: (source: Observation) => void;
  onSaved?: () => void;
  hidden?: boolean;
}) {
  const { t } = useTranslation();
  const fieldLabel = useFieldLabel(data);
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [locale, setLocale] = useState<"en" | "vi">("en");
  const selected = item.observations.find((source) => source.id === item.selection?.observation_id);
  const canonical = item.canonical;
  const shown = canonical
    ? `${canonical.value} ${canonical.unit}`.trim()
    : selected
      ? `${selected.normalized} ${selected.unit}`.trim()
      : "";
  const rule = data.workspace.policy?.fields?.find((rule) => rule.field === item.field);
  const configured =
    rule && data.workspace.template?.mappings.some((mapping) => mapping.field === item.field);
  const mutation = useMutation({
    mutationFn: async (withdraw: boolean) => {
      const params = { path: { case_id: caseId, field: item.field } };
      const revision = data.workspace.revision;
      return read(
        withdraw
          ? await api.POST("/api/v1/cases/{case_id}/review/fields/{field}/canonical/withdraw", {
              params,
              body: { revision, reason },
            })
          : await api.POST("/api/v1/cases/{case_id}/review/fields/{field}/canonical", {
              params,
              body: { revision, value, reason, number_locale: locale, reviewed },
            }),
      );
    },
    onSuccess: (result) => {
      onSaved?.();
      cache.setQueryData(reviewKey(caseId), result);
      setEditing(false);
      setReason("");
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate(false);
  };
  return (
    <section
      className={`canonical-entry ${canonical ? "canonical-manual" : ""} ${item.canonical_stale ? "canonical-stale" : ""}`}
      data-field={item.field}
      hidden={hidden}
    >
      <div className="canonical-value-column">
        <span className="canonical-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="canonical-editor-value">
          <label>
            {fieldLabel(item.field)}
            <input readOnly value={shown} placeholder={t("review.unset")} />
          </label>
          {!shown && <small className="canonical-missing">{t("integration.missingRed")}</small>}
          {canonical && (
            <small className="canonical-origin">
              {t(
                canonical.ai_reconciliation_id
                  ? "integration.aiConfirmedValue"
                  : canonical.source_observation_id
                    ? "integration.sourceValue"
                    : "integration.manualValue",
              )}
            </small>
          )}
          {item.canonical_stale && <p role="alert">{t("integration.staleEdit")}</p>}
          {configured && !editing && (
            <button
              className="canonical-edit-link"
              onClick={() => {
                setValue(
                  canonical?.value ??
                    selected?.normalized ??
                    item.observations[0]?.normalized ??
                    "",
                );
                setReviewed(false);
                setEditing(true);
              }}
            >
              <Pencil size={13} />
              {t(canonical ? "integration.editAgain" : "integration.editValue")}
            </button>
          )}
        </div>
      </div>
      <div className="canonical-source-column">
        {(canonical
          ? item.observations.filter((source) => canonical.source_ids.includes(source.id))
          : selected
            ? [selected]
            : []
        ).map((source) => (
          <button
            key={source.id}
            className="canonical-evidence-link"
            onClick={() => openSource(source)}
          >
            {source.document_type} · {t("review.page")} {source.page}
            <ArrowUpRight size={14} />
          </button>
        ))}
        {!canonical && !selected && <span className="review-hint">{t("review.unset")}</span>}
        {canonical && !canonical.source_ids.length && (
          <span className="review-hint">{t("integration.operatorProvided")}</span>
        )}
        <p className="canonical-selection-reason">
          {canonical?.reason ?? item.selection?.reason ?? "—"}
        </p>
      </div>
      {editing && (
        <form className="canonical-edit-form review-form" onSubmit={submit}>
          <p>{t("integration.editNotice")}</p>
          <div className="review-form-grid">
            <label>
              {t("integration.value")}
              <textarea
                aria-label={t("integration.value")}
                required
                maxLength={2000}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </label>
            {rule?.value_type === "decimal" && (
              <label>
                {t("review.locale")}
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as "en" | "vi")}
                >
                  <option value="en">{t("integration.localeEn")}</option>
                  <option value="vi">{t("integration.localeVi")}</option>
                </select>
              </label>
            )}
          </div>
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
            <Button
              type="submit"
              disabled={mutation.isPending || !value.trim() || !reason.trim() || !reviewed}
            >
              {t("integration.saveValue")}
            </Button>
            <Button variant="ghost" disabled={mutation.isPending} onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
            {canonical && (
              <Button
                variant="secondary"
                disabled={mutation.isPending || !reason.trim()}
                onClick={() => mutation.mutate(true)}
              >
                <RotateCcw size={14} />
                {t("integration.withdrawValue")}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
