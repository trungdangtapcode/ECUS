import type { ReviewWorkspace } from "@ecus/api-client";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

type Observation = ReviewWorkspace["readiness"]["comparisons"][number]["observations"][number];

export function EvidenceSourceSwitcher({
  fieldLabel,
  observations,
  documents,
  selectedId,
  onSelect,
}: {
  fieldLabel: string;
  observations: Observation[];
  documents: NonNullable<ReviewWorkspace["workspace"]["documents"]>;
  selectedId?: string;
  onSelect: (source: Observation) => void;
}) {
  const { t } = useTranslation();
  if (observations.length < 2) return null;

  return (
    <nav className="evidence-source-switcher" aria-label={t("review.switchSource")}>
      <p>{t("review.fieldSources", { field: fieldLabel, count: observations.length })}</p>
      <div className="evidence-source-options">
        {observations.map((source) => {
          const filename = documents.find(
            (document) => document.id === source.document_id,
          )?.filename;
          const value = `${source.normalized} ${source.unit}`.trim();
          return (
            <button
              type="button"
              key={source.id}
              data-source-id={source.id}
              aria-pressed={source.id === selectedId}
              aria-label={t("review.sourceChoice", { value, file: filename, page: source.page })}
              onClick={() => onSelect(source)}
            >
              <span>
                <strong title={value}>{value}</strong>
                <small title={filename}>
                  {filename} · {t("review.page")} {source.page}
                </small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
