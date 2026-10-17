import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ErrorState } from "../../components/error-state";
import { caseQuery } from "./queries";
import { useDesign } from "../../design/context";
import { reviewQuery } from "../review/queries";
import { workflowStatus } from "../review/workflow-status";
import { CaseActions } from "./case-actions";

export function CaseDetailPage() {
  const { caseId = "" } = useParams();
  const { path } = useDesign();
  const { t, i18n } = useTranslation();
  const query = useQuery(caseQuery(caseId));
  const review = useQuery(reviewQuery(caseId));
  const item = query.data;
  return (
    <>
      <Link className="back-link" to={path(item?.archived_at ? "/cases?view=archived" : "/cases")}>
        <ArrowLeft size={16} />
        {t("common.back")}
      </Link>
      {query.isPending && <p role="status">{t("common.loading")}</p>}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {item && (
        <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">{item.reference}</p>
              <h1>{item.title}</h1>
            </div>
            <span className="status-badge">
              {t(
                item.archived_at ? "cases.archived" : `caseWorkflow.${workflowStatus(review.data)}`,
              )}
            </span>
          </section>
          <section className="register detail-card">
            <h2>{t("cases.detailTitle")}</h2>
            {!item.archived_at && (
              <Link className="button button-primary" to={path(`/cases/${caseId}/review`)}>
                {t("review.open")}
              </Link>
            )}
            <div className="detail-content">
              <dl>
                <div>
                  <dt>{t("cases.reference")}</dt>
                  <dd>{item.reference}</dd>
                </div>
                <div>
                  <dt>{t("cases.procedure")}</dt>
                  <dd>{item.procedure}</dd>
                </div>
                <div>
                  <dt>{t("cases.created")}</dt>
                  <dd>
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "long",
                      timeStyle: "short",
                    }).format(new Date(item.created_at))}
                  </dd>
                </div>
              </dl>
              {!item.archived_at && (
                <div className="info-note">
                  <Check size={20} />
                  <p>{t("cases.detailDescription")}</p>
                </div>
              )}
            </div>
          </section>
          <CaseActions item={item} />
        </>
      )}
    </>
  );
}
