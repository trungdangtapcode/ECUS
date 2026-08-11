import type { ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { useFieldLabel } from "./field-label";

export function ExportCoverage({
  data,
  onReview,
}: {
  data: ReviewWorkspace;
  onReview: () => void;
}) {
  const { t } = useTranslation();
  const fieldLabel = useFieldLabel(data);
  const mappings = data.workspace.template?.mappings ?? [];
  if (!mappings.length) return null;
  const comparisons = new Map(data.readiness.comparisons.map((item) => [item.field, item]));
  const blankFields = new Set(
    data.readiness.comparisons
      .filter((item) => !item.observations.length && !item.canonical)
      .map((item) => item.field),
  );
  const ready = mappings.filter((item) => comparisons.get(item.field)?.resolved).length;
  const blank = mappings.filter((item) => blankFields.has(item.field));
  const blankTargets = new Map<string, typeof blank>();
  for (const item of blank) {
    const targets = blankTargets.get(item.field) ?? [];
    targets.push(item);
    blankTargets.set(item.field, targets);
  }
  const pending = mappings.length - ready - blank.length;
  return (
    <section className="export-coverage" aria-label={t("integration.exportCoverage")}>
      <h3>{t("integration.exportCoverage")}</h3>
      <p>
        {t("integration.coverageSummary", {
          cells: mappings.length,
          fields: new Set(mappings.map((item) => item.field)).size,
        })}
      </p>
      <dl className="export-coverage-counts">
        {[
          ["coverageReady", ready],
          ["coveragePending", pending],
          ["coverageBlank", blank.length],
        ].map(([key, count]) => (
          <div key={key}>
            <dt>{t(`integration.${key}`)}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
      {!!blankTargets.size && (
        <div className="review-missing-warning" role="status">
          <strong>{t("integration.missingCount", { count: blankTargets.size })}</strong>
          <p>{t("integration.blankReasonNotice")}</p>
          <p>{t("integration.missingExportNotice")}</p>
          <details>
            <summary>{t("integration.showMissing")}</summary>
            <ul className="export-blank-fields">
              {[...blankTargets].map(([field, targets]) => (
                <li key={field}>
                  <span>{fieldLabel(field)}</span>
                  <small>{targets.map((item) => `${item.sheet}!${item.cell}`).join(" · ")}</small>
                  <small>{t("integration.blankUnreviewed")}</small>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
      <Button variant="ghost" onClick={onReview}>
        {t("integration.coverageCheck")}
      </Button>
    </section>
  );
}
