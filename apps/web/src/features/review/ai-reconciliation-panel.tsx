import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, LoaderCircle, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { AITracePanel } from "./ai-trace-panel";
import { useFieldLabel } from "./field-label";
import { read, reviewKey } from "./queries";

type Comparison = ReviewWorkspace["readiness"]["comparisons"][number];
type Source = Comparison["observations"][number];

export function AIReconciliationPanel({
  caseId,
  data,
  onInspect,
}: {
  caseId: string;
  data: ReviewWorkspace;
  onInspect: (field: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const label = useFieldLabel(data);
  const cache = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const queryKey = ["ai-reconciliation", caseId, data.workspace.revision];
  const runs = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await api.GET("/api/v1/cases/{case_id}/review/reconciliations", {
        params: { path: { case_id: caseId } },
      });
      if (result.error || !result.data) throw new ApiError(result.error);
      return result.data;
    },
    refetchInterval: (query) =>
      query.state.data?.some((run) => ["pending", "running"].includes(run.status)) ? 1200 : false,
  });
  const current = runs.data?.find((run) => run.current);
  const active = runs.data?.find((run) => ["pending", "running"].includes(run.status));
  const start = useMutation({
    mutationFn: async () => {
      const result = await api.POST("/api/v1/cases/{case_id}/review/reconciliations", {
        params: { path: { case_id: caseId } },
        body: {
          revision: data.workspace.revision,
          locale: i18n.language.startsWith("vi") ? "vi" : "en",
        },
      });
      if (result.error || !result.data) throw new ApiError(result.error);
      return result.data;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey }),
  });
  const id = current?.id;
  const status = current?.status;
  useEffect(() => {
    if (id && status && ["succeeded", "failed", "interrupted"].includes(status)) {
      void cache.invalidateQueries({ queryKey: reviewKey(caseId) });
      void cache.invalidateQueries({ queryKey: ["ai-calls", caseId] });
    }
  }, [cache, caseId, id, status]);
  const differences = data.readiness.comparisons.filter(
    (item) => item.source_values_differ || item.semantic_review,
  );
  const equivalent = differences.filter(
    (item) =>
      item.semantic_review?.classification === "equivalent" &&
      !item.canonical &&
      !item.selection &&
      !item.resolved,
  );
  if (!differences.length && !data.workspace.ai_reconciliation && !active) return null;
  return (
    <section className="ai-reconciliation-panel" aria-label={t("reconciliation.title")}>
      <div className="ai-reconciliation-heading">
        <div>
          <h3>
            <Sparkles size={17} aria-hidden="true" />
            {t("reconciliation.title")}
          </h3>
          <p>{t("reconciliation.description")}</p>
        </div>
        <Button
          variant="secondary"
          disabled={!!active || !!current || start.isPending || !differences.length}
          onClick={() => start.mutate()}
        >
          {active || start.isPending ? (
            <LoaderCircle size={16} className="processing-spinner" />
          ) : null}
          {t(
            active
              ? "reconciliation.running"
              : current
                ? current.status === "succeeded"
                  ? "reconciliation.cached"
                  : "reconciliation.attemptSaved"
                : "reconciliation.start",
          )}
        </Button>
      </div>
      <p className="review-hint">{t("reconciliation.budget")}</p>
      {data.workspace.ai_reconciliation && !current && !active && !runs.isPending && (
        <p className="review-hint">{t("reconciliation.rulesUpdated")}</p>
      )}
      {runs.error && <ErrorState error={runs.error} />}
      {start.error && <ErrorState error={start.error} />}
      {current?.error_code && (
        <ErrorState error={new ApiError({ error: { code: current.error_code } })} />
      )}
      {active && <p role="status">{t("reconciliation.runningNotice")}</p>}
      {current?.batch && (
        <p className="ai-reconciliation-counts" role="status">
          {t("reconciliation.summary", {
            equivalent: differences.filter(
              (item) => item.semantic_review?.classification === "equivalent",
            ).length,
            different: differences.filter(
              (item) => item.semantic_review?.classification !== "equivalent",
            ).length,
          })}
        </p>
      )}
      {!!equivalent.length && (
        <details className="ai-equivalent-list" open>
          <summary>{t("reconciliation.equivalentGroup", { count: equivalent.length })}</summary>
          <p className="review-hint">{t("reconciliation.reviewNotice")}</p>
          {equivalent.map((item) => (
            <div className="ai-equivalent-row" key={item.field}>
              <span>{label(item.field)}</span>
              <strong>{item.semantic_review?.proposed_value}</strong>
              <button type="button" onClick={() => onInspect(item.field)}>
                {t("reconciliation.inspect")}
                <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            </div>
          ))}
          {!confirming && (
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              {t("reconciliation.confirmEquivalent", { count: equivalent.length })}
            </Button>
          )}
          {confirming && data.workspace.ai_reconciliation && (
            <ReconciliationConfirmation
              key={equivalent.map((item) => item.field).join(":")}
              caseId={caseId}
              data={data}
              fields={equivalent.map((item) => item.field)}
              onDone={() => setConfirming(false)}
              onCancel={() => setConfirming(false)}
            />
          )}
        </details>
      )}
      <AITracePanel caseId={caseId} data={data} active={!!active} />
    </section>
  );
}

export function ReconciliationSuggestion({
  caseId,
  data,
  item,
  onPreview,
}: {
  caseId: string;
  data: ReviewWorkspace;
  item: Comparison;
  onPreview: (source: Source) => void;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const decision = item.semantic_review;
  if (!decision) return null;
  const sources = item.observations.filter((source) => decision.source_ids.includes(source.id));
  const allowed =
    !!decision.proposed_value && !decision.guard_code && !item.canonical && !item.selection;
  return (
    <section className="ai-field-suggestion" aria-label={t("reconciliation.proposal")}>
      <h4>{t(`reconciliation.classifications.${decision.classification}`)}</h4>
      {decision.guard_code ? (
        <p>{t(`reconciliation.guards.${decision.guard_code}`)}</p>
      ) : (
        <p>{decision.reason}</p>
      )}
      {decision.proposed_value && (
        <div className="ai-suggested-value">
          <small>
            {t(
              decision.source_observation_id
                ? "reconciliation.sourceProposal"
                : "reconciliation.standardizedProposal",
            )}
          </small>
          <strong>{decision.proposed_value}</strong>
        </div>
      )}
      {!!decision.address_references?.length && (
        <div className="ai-address-references">
          {decision.address_references.map((reference) => (
            <a key={reference.id} href={reference.source_url} target="_blank" rel="noreferrer">
              {t("reconciliation.addressReference", { date: reference.effective_from })}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
      <div className="ai-proposal-sources">
        {decision.port_references?.map((reference) => (
          <a key={reference.id} href={reference.source_url} target="_blank" rel="noreferrer">
            {t("reconciliation.portReference")}
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        ))}
        {sources.map((source) => (
          <button key={source.id} type="button" onClick={() => onPreview(source)}>
            {data.workspace.documents?.find((doc) => doc.id === source.document_id)?.filename}
            {` · ${t("review.page")} ${source.page}`}
            <ArrowUpRight size={13} aria-hidden="true" />
          </button>
        ))}
      </div>
      {allowed && !confirming && (
        <Button
          variant="secondary"
          onClick={() => {
            const source =
              sources.find((item) => item.id === decision.source_observation_id) ?? sources[0];
            if (source) onPreview(source);
            setConfirming(true);
          }}
        >
          {t("reconciliation.useProposal")}
        </Button>
      )}
      {allowed && confirming && (
        <ReconciliationConfirmation
          caseId={caseId}
          data={data}
          fields={[item.field]}
          onDone={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
      {(item.canonical || item.selection) && (
        <small>{t("reconciliation.operatorChoiceKept")}</small>
      )}
    </section>
  );
}

function ReconciliationConfirmation({
  caseId,
  data,
  fields,
  onDone,
  onCancel,
}: {
  caseId: string;
  data: ReviewWorkspace;
  fields: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState(() => t("reconciliation.confirmReason"));
  const mutation = useMutation({
    mutationFn: async () =>
      read(
        await api.POST("/api/v1/cases/{case_id}/review/reconciliations/{job_id}/apply", {
          params: { path: { case_id: caseId, job_id: data.workspace.ai_reconciliation!.id } },
          body: { revision: data.workspace.revision, fields, reviewed, reason },
        }),
      ),
    onSuccess: (result) => {
      cache.setQueryData(reviewKey(caseId), result);
      onDone();
    },
  });
  return (
    <form
      className="ai-reconciliation-confirm review-form"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <label>
        {t("review.reason")}
        <textarea
          aria-label={t("review.reason")}
          value={reason}
          required
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <label className="review-checkbox">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        {t("reconciliation.confirmReview")}
      </label>
      {mutation.error && <ErrorState error={mutation.error} />}
      <div className="review-actions">
        <Button type="submit" disabled={!reviewed || !reason.trim() || mutation.isPending}>
          {t("integration.saveValue")}
        </Button>
        <Button variant="ghost" disabled={mutation.isPending} onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
