import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReviewWorkspace } from "@ecus/api-client";
import { ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { CanonicalEditor } from "./canonical-editor";
import { useFieldLabel } from "./field-label";

type Comparison = ReviewWorkspace["readiness"]["comparisons"][number];
const pageSize = 20;
const filters = ["all", "attention", "resolved", "missing"] as const;
type Filter = (typeof filters)[number];

export function CanonicalSheet({
  caseId,
  data,
  openSource,
  onExport,
}: {
  caseId: string;
  data: ReviewWorkspace;
  openSource: (source: Comparison["observations"][number]) => void;
  onExport: () => void;
}) {
  const { t, i18n } = useTranslation();
  const fieldLabel = useFieldLabel(data);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const comparisons = data.readiness.comparisons;
  const matchesFilter = (item: Comparison, selected: Filter) =>
    selected === "all" ||
    (selected === "resolved" && item.resolved) ||
    (selected === "missing" && !item.observations.length && !item.canonical) ||
    (selected === "attention" &&
      !item.resolved &&
      (item.observations.length > 0 || !!item.canonical));
  const matching = comparisons.filter(
    (item) =>
      matchesFilter(item, filter) &&
      `${fieldLabel(item.field)} ${item.field}`
        .toLocaleLowerCase(i18n.language)
        .includes(search.trim().toLocaleLowerCase(i18n.language)),
  );
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shownFields = new Set(
    matching.slice(current * pageSize, (current + 1) * pageSize).map((item) => item.field),
  );
  return (
    <section className="canonical-sheet" aria-label={t("review.canonical")}>
      <header className="canonical-columns">
        <h2>{t("workbench.value")}</h2>
        <span>{t("review.source")}</span>
      </header>
      <label className="review-field-search">
        {t("integration.findField")}
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
      </label>
      <div className="comparison-filters" aria-label={t("processing.filterLabel")}>
        {filters.map((item) => (
          <button
            key={item}
            aria-pressed={filter === item}
            onClick={() => {
              setFilter(item);
              setPage(0);
            }}
          >
            {t(`processing.filters.${item}`)}
            <span className="canonical-filter-count">
              {comparisons.filter((entry) => matchesFilter(entry, item)).length}
            </span>
          </button>
        ))}
      </div>
      {filter === "missing" && <p className="review-hint">{t("integration.blankReasonNotice")}</p>}
      <nav className="canonical-pagination" aria-label={t("integration.fieldPages")}>
        <span role="status">
          {t("integration.fieldRange", {
            start: matching.length ? current * pageSize + 1 : 0,
            end: Math.min((current + 1) * pageSize, matching.length),
            count: matching.length,
          })}
        </span>
        <div>
          <Button variant="ghost" disabled={!current} onClick={() => setPage(current - 1)}>
            {t("common.previous")}
          </Button>
          <Button
            variant="ghost"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      </nav>
      {!matching.length && <p className="source-dock-empty">{t("processing.filterEmpty")}</p>}
      {/* Keep drafts mounted when searching or paging within the sheet. */}
      {comparisons.map((item, index) => (
        <CanonicalEditor
          key={item.field}
          caseId={caseId}
          data={data}
          item={item}
          index={index}
          openSource={openSource}
          hidden={!shownFields.has(item.field)}
        />
      ))}
      <footer className="canonical-actions">
        <p>{t("studioVisual.reviewNote")}</p>
        <button className="canonical-review-button" onClick={onExport}>
          {t("harborApp.export")}
          <ArrowRight size={17} />
        </button>
      </footer>
    </section>
  );
}
