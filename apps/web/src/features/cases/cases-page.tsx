import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Archive, ArrowRight, FolderPlus, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { casesQuery, pageSize } from "./queries";
import { CreateCaseDialog } from "./create-case-dialog";
import { ShipmentCover } from "../../design/harbor/shipment-cover";
import { reviewQuery } from "../review/queries";
import { workflowStatus } from "../review/workflow-status";
import { AnimatedCount, TabIndicator } from "../../design/motion";
import { useMotionRecipe } from "../../design/motion-hooks";

export function CasesPage() {
  const { t, i18n } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  const archived = params.get("view") === "archived";
  const effects = useMotionRecipe();
  const query = useQuery(casesQuery(offset, archived));
  const items = query.data?.items ?? [];
  const reviews = useQueries({
    queries: archived ? [] : items.map((item) => reviewQuery(item.id)),
  });
  const complete = query.isSuccess && reviews.every((review) => review.isSuccess);
  const pendingReviews = reviews.some((review) => review.isPending);
  const failedReview = reviews.find((review) => review.isError);
  const agenda = items
    .map((item, index) => ({
      item,
      count:
        reviews[index]?.data?.readiness.comparisons.filter(
          (field) => !field.resolved && (field.observations.length > 0 || !!field.canonical),
        ).length ?? 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
  const issues = reviews.reduce(
    (sum, review) =>
      sum +
      (review.data?.readiness.comparisons.filter(
        (item) =>
          !item.resolved &&
          (["MISMATCH", "NEEDS_REVIEW", "EXTRACTION_UNCERTAIN"].includes(item.status) ||
            review.data?.readiness.blockers.some((blocker) =>
              blocker.startsWith(`${item.field}:`),
            )),
      ).length ?? 0),
    0,
  );
  const documents = reviews.reduce(
    (sum, review) =>
      sum + (review.data?.workspace.documents?.filter((item) => !item.withdrawn).length ?? 0),
    0,
  );
  const approved = reviews.filter((review) => review.data?.readiness.approved).length;
  const counts = [
    query.data?.total,
    complete ? issues : undefined,
    complete ? documents : undefined,
    complete ? approved : undefined,
  ];
  const labels = [
    "harborApp.total",
    "harborApp.attention",
    "harborApp.documents",
    "studioProduct.completed",
  ];
  const visible = items.filter((item) =>
    `${item.title} ${item.reference} ${item.procedure}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{t("harborApp.eyebrow")}</p>
          <h1>{t(archived ? "cases.archivedTitle" : "harborApp.overview")}</h1>
          <p>{t(archived ? "cases.archiveListDescription" : "harborApp.overviewDescription")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={18} />
          {t("cases.create")}
        </Button>
      </section>
      <div className="overview-register">
        {!archived && <ShipmentCover item={items[0]} onCreate={() => setCreating(true)} />}
        {!archived && (
          <dl className="register-totals" aria-label={t("harborApp.pageScope")}>
            {counts.map((count, index) => (
              <motion.div
                key={labels[index]}
                {...effects.reveal(index + 1)}
                whileHover={effects.hover}
              >
                <dt>{t(labels[index]!)}</dt>
                <dd>
                  <AnimatedCount value={count} />
                </dd>
              </motion.div>
            ))}
          </dl>
        )}
        <div className="register-body">
          <section className="case-register register" aria-labelledby="register-title">
            <div className="register-heading">
              <h2 id="register-title">{t("harborApp.records")}</h2>
              <span className="register-caption">
                {t("cases.count", { count: query.data?.total ?? 0 })}
              </span>
            </div>
            <div className="register-tools">
              <div
                className="register-filters motion-tabs"
                role="group"
                aria-label={t("cases.scope")}
              >
                {[false, true].map((value) => (
                  <button
                    key={String(value)}
                    aria-pressed={archived === value}
                    onClick={() => {
                      setOffset(0);
                      setSearch("");
                      setParams(value ? { view: "archived" } : {});
                    }}
                  >
                    {value && <Archive size={14} />}
                    {archived === value && <TabIndicator id="case-filter" />}
                    <span className="motion-tab-label">
                      {t(value ? "cases.archived" : "cases.active")}
                    </span>
                  </button>
                ))}
              </div>
              <label className="register-search">
                <Search size={15} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label={t("harborApp.search")}
                  placeholder={t("harborApp.search")}
                />
              </label>
            </div>
            {query.isPending && (
              <div className="loading-state" role="status">
                {t("common.loading")}
              </div>
            )}
            {query.isError && (
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            )}
            {query.isSuccess && !items.length && (
              <div className="empty-state">
                <FolderPlus size={32} strokeWidth={1.4} />
                <h3>{t(archived ? "cases.archiveEmpty" : "cases.emptyTitle")}</h3>
                <p>{t(archived ? "cases.archiveEmptyDescription" : "cases.emptyDescription")}</p>
                {!archived && (
                  <Button variant="secondary" onClick={() => setCreating(true)}>
                    {t("cases.emptyAction")}
                  </Button>
                )}
              </div>
            )}
            {items.length > 0 && (
              <>
                <div className="register-scroll">
                  <table className="case-table register-table">
                    <thead>
                      <tr>
                        <th>{t("cases.name")}</th>
                        <th>{t("cases.procedure")}</th>
                        <th>{t("cases.created")}</th>
                        <th>{t("cases.status")}</th>
                        <th>
                          <span className="sr-only">{t("review.open")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {visible.map((item, index) => (
                          <motion.tr
                            key={item.id}
                            layout="position"
                            {...effects.reveal(index)}
                            exit={{
                              opacity: 0,
                              x: effects.reduced ? 0 : -24,
                              pointerEvents: "none",
                            }}
                            whileHover={
                              effects.reduced
                                ? undefined
                                : { x: 6, backgroundColor: "var(--accent-soft)" }
                            }
                          >
                            <td>
                              <Link
                                className="register-case-name"
                                to={`/cases/${item.id}`}
                                aria-label={t("cases.open", { reference: item.reference })}
                              >
                                <strong>{item.title}</strong>
                                <span>{item.reference}</span>
                              </Link>
                            </td>
                            <td>
                              <span className="register-procedure">{item.procedure}</span>
                            </td>
                            <td>{date.format(new Date(item.created_at))}</td>
                            <td>
                              <span
                                className="register-status"
                                data-tone={
                                  reviews[items.findIndex((record) => record.id === item.id)]?.data
                                    ?.readiness.approved
                                    ? "complete"
                                    : "review"
                                }
                              >
                                {t(
                                  archived
                                    ? "cases.archived"
                                    : `caseWorkflow.${workflowStatus(reviews[items.findIndex((record) => record.id === item.id)]?.data)}`,
                                )}
                              </span>
                            </td>
                            <td>
                              <Link
                                className="register-open"
                                to={archived ? `/cases/${item.id}` : `/cases/${item.id}/review`}
                                aria-label={`${t("review.open")} · ${item.reference}`}
                              >
                                <ArrowRight size={17} />
                              </Link>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                {!visible.length && <p className="agenda-note">{t("harborApp.noResults")}</p>}
                <div className="pagination">
                  <small>
                    {t("cases.page", {
                      page: Math.floor(offset / pageSize) + 1,
                      pages: Math.ceil((query.data?.total ?? 0) / pageSize),
                    })}
                  </small>
                  <div>
                    <Button
                      variant="ghost"
                      disabled={!offset}
                      onClick={() => setOffset(Math.max(0, offset - pageSize))}
                    >
                      {t("common.previous")}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={offset + pageSize >= (query.data?.total ?? 0)}
                      onClick={() => setOffset(offset + pageSize)}
                    >
                      {t("common.next")}
                    </Button>
                  </div>
                </div>
              </>
            )}
            <div className="register-footer">
              <span>{t("harborApp.pageScope")}</span>
              <span>{t("app.footer")}</span>
            </div>
          </section>
          {!archived && (
            <aside className="review-agenda">
              <div className="register-heading">
                <div>
                  <p className="register-caption">{t("harborApp.next")}</p>
                  <h2>{t("harborApp.attention")}</h2>
                </div>
              </div>
              <ol>
                {agenda.map(({ item, count }, index) => (
                  <motion.li
                    key={item.id}
                    {...effects.reveal(index + 2)}
                    whileHover={effects.reduced ? undefined : { x: 6 }}
                  >
                    <Link to={`/cases/${item.id}/review?section=compare`}>
                      <span className="agenda-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="agenda-copy">
                        <small>{item.reference}</small>
                        <strong>{item.title}</strong>
                        <span>
                          {t("harborApp.agendaIssues", { count })}
                          <ArrowRight size={13} />
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
              {pendingReviews && <p role="status">{t("common.loading")}</p>}
              {failedReview && (
                <ErrorState
                  error={failedReview.error}
                  onRetry={() => reviews.forEach((review) => void review.refetch())}
                />
              )}
              {complete && !agenda.length && (
                <p className="agenda-clear">{t("harborApp.emptyAgenda")}</p>
              )}
              <p className="agenda-note">{t("studioVisual.reviewNote")}</p>
            </aside>
          )}
        </div>
      </div>
      {creating && <CreateCaseDialog onClose={() => setCreating(false)} />}
    </>
  );
}
