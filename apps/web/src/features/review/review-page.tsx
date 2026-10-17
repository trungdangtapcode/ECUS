import {
  FileText,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  CircleAlert,
  Check,
  UploadCloud,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "../../lib/api";
import { caseQuery } from "../cases/queries";
import { CaseActions } from "../cases/case-actions";
import { lazy, Suspense, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReviewMapping, ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorState } from "../../components/error-state";
import { Button } from "../../components/ui/button";
import { useDesign } from "../../design/context";
import { read, encodeFile, reviewActions, reviewFileUrl, reviewKey, reviewQuery } from "./queries";
import { ConfigurationPanel } from "./configuration-panel";
import { AITracePanel } from "./ai-trace-panel";
import { ProcessingPanel } from "./processing-panel";
import { ConsistentReviewPanel } from "./consistent-review-panel";
import { ExtractionPanel } from "./extraction-panel";
import { TemplateProfilePanel } from "./template-profile-panel";
import { CanonicalEditor } from "./canonical-editor";
import { CanonicalSheet } from "./canonical-sheet";
import { ExportCoverage } from "./export-coverage";
import { EvidenceSourceSwitcher } from "./evidence-source-switcher";
import { SourceValuePicker } from "./source-value-picker";
import { AIReconciliationPanel, ReconciliationSuggestion } from "./ai-reconciliation-panel";
import { PageTranscriptPanel } from "./page-transcript-panel";
import { useFieldLabel } from "./field-label";
import "./review.css";

const PdfPreview = lazy(() => import("./pdf-preview"));

type Observation = NonNullable<ReviewWorkspace["workspace"]["observations"]>[number];
const blankMapping = (): ReviewMapping => ({ field: "", sheet: "", cell: "", required: true });

export function ReviewPage() {
  const { caseId = "" } = useParams();
  const query = useQuery(reviewQuery(caseId));
  const record = useQuery(caseQuery(caseId));
  const [search] = useSearchParams();
  const section = search.get("section") ?? "documents";
  const heading = ["documents", "compare", "canonical", "export"].includes(section)
    ? `harborApp.${section}`
    : `review.${section === "audit" ? "audit" : "rules"}`;
  const { t } = useTranslation();
  const { path } = useDesign();
  if (record.data?.archived_at) {
    return (
      <>
        <Link className="back-link" to={path(`/cases/${caseId}`)}>
          {t("review.back")}
        </Link>
        <section className="page-heading">
          <div>
            <p className="eyebrow">{record.data.reference}</p>
            <h1>{record.data.title}</h1>
          </div>
        </section>
        <CaseActions item={record.data} />
      </>
    );
  }
  return (
    <>
      <Link className="back-link" to={path(`/cases/${caseId}`)}>
        {t("review.back")}
      </Link>
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            {record.data?.reference} / {record.data?.procedure}
          </p>
          <h1>{t(heading)}</h1>
          <p>
            {t(
              ["documents", "compare", "canonical", "export"].includes(section)
                ? `harborApp.${section}Description`
                : "review.description",
            )}
          </p>
        </div>
      </section>
      {query.isPending && <p role="status">{t("common.loading")}</p>}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && record.isSuccess && (
        <ReviewWorkbench key={caseId} caseId={caseId} data={query.data} />
      )}
    </>
  );
}

function ReviewWorkbench({ caseId, data }: { caseId: string; data: ReviewWorkspace }) {
  const { t, i18n } = useTranslation();
  const cache = useQueryClient();
  const { workspace, readiness } = data;
  const fieldLabel = useFieldLabel(data);
  const revision = workspace.revision;
  const documents = workspace.documents ?? [];
  const exports = workspace.exports ?? [];
  const audit = workspace.audit ?? [];
  const [search, setSearch] = useSearchParams();
  const requestedTab = search.get("section");
  const tab =
    requestedTab &&
    ["documents", "compare", "canonical", "export", "rules", "audit"].includes(requestedTab)
      ? requestedTab
      : "documents";
  const setTab = (section: string) =>
    setSearch((previous) => {
      previous.set("section", section);
      return previous;
    });
  const [documentId, setDocumentId] = useState("");
  const [comparisonField, setComparisonField] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [comparisonFilter, setComparisonFilter] = useState("attention");
  const [auditPage, setAuditPage] = useState(0);
  const auditPages = Math.max(1, Math.ceil(audit.length / 25));
  const currentAuditPage = Math.min(auditPage, auditPages - 1);
  const arithmeticMismatch = (field: string) =>
    readiness.arithmetic_checks?.some(
      (check) => check.result_field === field && check.status === "MISMATCH",
    );
  const comparisonStatusKey = (item: (typeof readiness.comparisons)[number]) =>
    arithmeticMismatch(item.field)
      ? "integration.arithmetic.mismatch"
      : item.resolved
        ? "integration.resolved"
        : item.semantic_review?.classification === "equivalent"
          ? "reconciliation.classifications.equivalent"
          : item.source_values_differ
            ? "processing.sourceConflict"
            : !item.observations.length
              ? "integration.missingField"
              : `workbench.statuses.${item.status}`;
  const visibleComparisons = readiness.comparisons.filter(
    (item) =>
      !fieldSearch.trim() ||
      `${fieldLabel(item.field)} ${item.field}`
        .toLocaleLowerCase(i18n.language)
        .includes(fieldSearch.trim().toLocaleLowerCase(i18n.language)),
  );

  const displayedComparisons = visibleComparisons
    .filter(
      (item) =>
        fieldSearch.trim() ||
        comparisonFilter === "all" ||
        (comparisonFilter === "attention" &&
          !item.resolved &&
          item.semantic_review?.classification !== "equivalent" &&
          (item.observations.length > 0 || item.canonical)) ||
        (comparisonFilter === "equivalent" &&
          item.semantic_review?.classification === "equivalent" &&
          !item.resolved) ||
        (comparisonFilter === "missing" && !item.observations.length && !item.canonical) ||
        (comparisonFilter === "resolved" && item.resolved),
    )
    .sort((left, right) => {
      if (comparisonFilter !== "attention") return 0;
      const priority = (item: (typeof readiness.comparisons)[number]) =>
        arithmeticMismatch(item.field) ? 2 : item.source_values_differ && !item.resolved ? 1 : 0;
      return priority(right) - priority(left);
    });
  const activeComparison =
    visibleComparisons.find((item) => item.field === comparisonField) ?? displayedComparisons[0];
  const [page, setPage] = useState(1);
  const [showPdf, setShowPdf] = useState(false);
  const [quote, setQuote] = useState("");
  const [quoteOffset, setQuoteOffset] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<Observation | null>(null);
  const [field, setField] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [valueType, setValueType] = useState<"text" | "decimal">("text");
  const [unit, setUnit] = useState("");
  const [locale, setLocale] = useState<"en" | "vi">("en");
  const [editing, setEditing] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [reason, setReason] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [mappingVersion, setMappingVersion] = useState("");
  const [mappings, setMappings] = useState<ReviewMapping[]>([blankMapping()]);
  const mutation = useMutation({
    mutationFn: (action: () => Promise<ReviewWorkspace>) => action(),
    onSuccess: (result) => {
      cache.setQueryData(reviewKey(caseId), result);
    },
  });
  const run = (action: () => Promise<ReviewWorkspace>) => {
    if (tab === "compare" && activeComparison) setComparisonField(activeComparison.field);
    mutation.mutate(action);
  };
  const doc =
    documents.find((item) => item.id === documentId) ?? documents.find((item) => !item.withdrawn);
  const sourceText =
    doc?.transcripts?.[page] ?? doc?.ocr_pages?.[page]?.text ?? doc?.pages[page - 1] ?? "";
  const shownHighlight =
    highlight?.document_id === doc?.id && highlight?.page === page ? highlight : null;
  const busy = mutation.isPending;
  const uploadFiles = (files: File[]) => {
    if (!files.length || busy) return;
    run(async () => {
      let result = data;
      for (const file of files) {
        result = await reviewActions.upload(
          caseId,
          result.workspace.revision,
          file.name,
          await encodeFile(file),
        );
        cache.setQueryData(reviewKey(caseId), result);
      }
      return result;
    });
  };
  const openSource = (item: Observation) => {
    setDocumentId(item.document_id);
    setPage(item.page);
    setHighlight(item);
    setShowPdf(true);
  };
  const record = (event: FormEvent) => {
    event.preventDefault();
    if (!doc || doc.withdrawn) return;
    const body = {
      revision,
      field,
      document_id: doc.id,
      document_type: documentType,
      page,
      quote,
      source_offset: quoteOffset ?? undefined,
      value_type: valueType,
      unit,
      number_locale: locale,
      verified,
    };
    if (editing)
      run(async () => {
        const result = await reviewActions.correct(caseId, editing, { ...body, reason });
        setEditing(null);
        setVerified(false);
        return result;
      });
    else run(() => reviewActions.observe(caseId, body));
  };
  const registerTemplate = (event: FormEvent) => {
    event.preventDefault();
    if (!templateFile) return;
    run(async () =>
      reviewActions.template(caseId, {
        revision,
        filename: templateFile.name,
        content_base64: await encodeFile(templateFile),
        version,
        mapping_version: mappingVersion,
        mappings,
      }),
    );
  };
  const updateMapping = (index: number, patch: Partial<ReviewMapping>) =>
    setMappings((rows) => rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(
      new Date(value),
    );
  const reasonInput = (
    <label>
      {t("review.reason")}
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t("review.reasonPlaceholder")}
        maxLength={2000}
      />
    </label>
  );

  return (
    <div className="review-workbench canonical-workspace">
      <nav className="review-tabs" aria-label={t("review.title")}>
        {["documents", "compare", "canonical", "export", "rules", "audit"].map((key) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "secondary"}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            {t(`review.${key}`)}
          </Button>
        ))}
      </nav>
      <p className="review-revision">
        {t("review.revision")} {revision} ·{" "}
        {t(
          readiness.approved
            ? "review.approved"
            : readiness.eligible
              ? "review.ready"
              : "review.blocked",
        )}
      </p>
      {mutation.isError && (
        <ErrorState
          error={mutation.error}
          onRetry={() => {
            mutation.reset();
            void cache.invalidateQueries({ queryKey: reviewKey(caseId) });
          }}
        />
      )}
      {busy && <p role="status">{t("review.pending")}</p>}
      <fieldset
        className={`review-fieldset ${["compare", "canonical"].includes(tab) ? "evidence-workspace" : ""}`}
        disabled={busy}
      >
        {tab === "rules" && <ConfigurationPanel caseId={caseId} data={data} />}
        {tab === "documents" && (
          <section className="register review-section">
            <TemplateProfilePanel caseId={caseId} data={data} />
            <div
              className="upload-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                uploadFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <span className="upload-icon">
                <UploadCloud size={27} strokeWidth={1.5} />
              </span>
              <div>
                <h2>{t("harborApp.documents")}</h2>
                <p>{t("review.empty")}</p>
              </div>
              <label className="review-upload">
                {t("review.upload")}
                <input
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  onChange={(event) => {
                    uploadFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <ProcessingPanel caseId={caseId} data={data} onReview={() => setTab("compare")} />
            {!!documents.length && (
              <div className="document-list">
                {documents
                  .filter((item) => !item.withdrawn)
                  .map((item, index) => (
                    <button
                      className={`document-row ${doc?.id === item.id ? "active" : ""}`}
                      key={item.id}
                      onClick={() => {
                        setDocumentId(item.id);
                        setPage(1);
                        setHighlight(null);
                        setQuote("");
                        setQuoteOffset(null);
                        setVerified(false);
                      }}
                    >
                      <span className="document-icon">
                        <FileText size={22} />
                        <small>PDF</small>
                      </span>
                      <span className="document-name">
                        <strong>{item.filename}</strong>
                        <small>
                          {t("review.page")} · {item.pages.length}
                        </small>
                      </span>
                      <span className="document-number">{String(index + 1).padStart(2, "0")}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </div>
            )}
            <ExtractionPanel
              caseId={caseId}
              data={data}
              documentId={doc?.withdrawn ? undefined : doc?.id}
            />
            {!doc ? (
              <p>{t("review.empty")}</p>
            ) : (
              <>
                <div className="review-form-grid">
                  <label>
                    {t("review.document")}
                    <select
                      value={doc.id}
                      onChange={(event) => {
                        setDocumentId(event.target.value);
                        setPage(1);
                        setHighlight(null);
                        setQuote("");
                        setQuoteOffset(null);
                        setVerified(false);
                      }}
                    >
                      {documents
                        .filter((item) => !item.withdrawn || item.id === doc.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.filename}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {t("review.page")}
                    <select
                      value={page}
                      onChange={(event) => {
                        setPage(Number(event.target.value));
                        setQuote("");
                        setQuoteOffset(null);
                        setVerified(false);
                      }}
                    >
                      {doc.pages.map((_, index) => (
                        <option key={index} value={index + 1}>
                          {index + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <PageTranscriptPanel caseId={caseId} data={data} documentId={doc.id} page={page} />
                {doc.transcripts?.[page] && (
                  <p className="info-note">{t("integration.transcriptSaved")}</p>
                )}
                {doc.ocr_pages?.[page] &&
                  !doc.ocr_pages[page].is_blank &&
                  !doc.transcripts?.[page] && (
                    <p className="info-note">{t("processing.ocrSource")}</p>
                  )}
                <a
                  className="back-link"
                  href={`${reviewFileUrl(caseId, "documents", doc.id)}#page=${page}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("review.openOriginal")} ↗
                </a>
                <Button
                  variant="secondary"
                  aria-expanded={showPdf}
                  onClick={() => setShowPdf((value) => !value)}
                >
                  {t("workbench.originalView")}
                </Button>
                {showPdf && (
                  <Suspense fallback={<p>{t("common.loading")}</p>}>
                    <PdfPreview
                      key={`${doc.id}:${page}:${shownHighlight?.id ?? ""}`}
                      url={reviewFileUrl(caseId, "documents", doc.id)}
                      pageNumber={page}
                      quote={shownHighlight?.quote ?? ""}
                      ocrPage={
                        shownHighlight?.source_kind === "ocr" ? doc.ocr_pages?.[page] : undefined
                      }
                      sourceOffset={shownHighlight?.offset}
                    />
                  </Suspense>
                )}
                <div className="review-source-grid">
                  <div>
                    <h3>{t("review.sourceText")}</h3>
                    <p className="review-hint">
                      {doc.filename} · {t("review.page")} {page}
                      {shownHighlight && ` · ${t("review.offset")} ${shownHighlight.offset}`}
                    </p>
                    <pre
                      className="review-source-text"
                      onMouseUp={(event) => {
                        const selection = window.getSelection();
                        const value = selection?.toString() ?? "";
                        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
                        if (
                          value &&
                          range &&
                          event.currentTarget.contains(range.startContainer) &&
                          event.currentTarget.contains(range.endContainer)
                        ) {
                          const prefix = range.cloneRange();
                          prefix.selectNodeContents(event.currentTarget);
                          prefix.setEnd(range.startContainer, range.startOffset);
                          setQuoteOffset(Array.from(prefix.toString()).length);
                          setQuote(value);
                          setVerified(false);
                        }
                      }}
                    >
                      {shownHighlight ? (
                        <>
                          {Array.from(sourceText).slice(0, shownHighlight.offset).join("")}
                          <mark>{shownHighlight.quote}</mark>
                          {Array.from(sourceText)
                            .slice(shownHighlight.offset + Array.from(shownHighlight.quote).length)
                            .join("")}
                        </>
                      ) : (
                        sourceText || t("review.scanNote")
                      )}
                    </pre>
                  </div>
                  <details className="review-manual-tools" open={!!editing}>
                    <summary>{t("processing.manualTools")}</summary>
                    <form onSubmit={record} className="review-form">
                      {editing && (
                        <>
                          <p>{t("rules.correctionNote")}</p>
                          {reasonInput}
                          <Button variant="ghost" onClick={() => setEditing(null)}>
                            {t("rules.cancelCorrection")}
                          </Button>
                        </>
                      )}
                      <label>
                        {t("review.field")}
                        {workspace.template?.profile_id ? (
                          <select
                            required
                            value={field}
                            onChange={(event) => {
                              const rule = workspace.policy?.fields?.find(
                                (item) => item.field === event.target.value,
                              );
                              setField(event.target.value);
                              setValueType(rule?.value_type ?? "text");
                              setUnit(rule?.unit ?? "");
                            }}
                          >
                            <option value="">{t("review.field")}</option>
                            {workspace.policy?.fields?.map((item) => (
                              <option key={item.field} value={item.field}>
                                {fieldLabel(item.field)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={field}
                            onChange={(event) => setField(event.target.value)}
                            required
                            pattern="[a-z][a-z0-9_]{0,63}"
                            maxLength={64}
                          />
                        )}
                      </label>
                      <p className="review-hint">{t("review.fieldHint")}</p>
                      <label>
                        {t("review.logicalType")}
                        <input
                          required
                          maxLength={80}
                          value={documentType}
                          onChange={(event) => setDocumentType(event.target.value)}
                        />
                      </label>
                      <label>
                        {t("review.quote")}
                        <textarea
                          required
                          maxLength={2000}
                          value={quote}
                          onChange={(event) => {
                            setQuote(event.target.value);
                            setQuoteOffset(null);
                            setVerified(false);
                          }}
                        />
                      </label>
                      <p className="review-hint">{t("review.quoteHint")}</p>
                      <div className="review-form-grid">
                        <label>
                          {t("review.type")}
                          <select
                            value={valueType}
                            onChange={(event) =>
                              setValueType(event.target.value as "text" | "decimal")
                            }
                          >
                            <option value="text">{t("review.text")}</option>
                            <option value="decimal">{t("review.decimal")}</option>
                          </select>
                        </label>
                        <label>
                          {t("review.unit")}
                          <input
                            value={unit}
                            onChange={(event) => setUnit(event.target.value)}
                            maxLength={20}
                          />
                        </label>
                        {valueType === "decimal" && (
                          <label>
                            {t("review.locale")}
                            <select
                              value={locale}
                              onChange={(event) => setLocale(event.target.value as "en" | "vi")}
                            >
                              <option value="en">1,234.56</option>
                              <option value="vi">1.234,56</option>
                            </select>
                          </label>
                        )}
                      </div>
                      <label className="review-checkbox">
                        <input
                          type="checkbox"
                          disabled={!!editing || doc.withdrawn}
                          checked={verified}
                          onChange={(event) => setVerified(event.target.checked)}
                        />
                        {t("review.verified")}
                      </label>
                      <Button
                        type="submit"
                        disabled={!sourceText || doc.withdrawn || (!!editing && !reason.trim())}
                      >
                        {t(editing ? "rules.saveCorrection" : "review.record")}
                      </Button>
                    </form>
                  </details>
                </div>
              </>
            )}
          </section>
        )}
        {tab === "compare" && (
          <section className="register review-section">
            <AIReconciliationPanel
              caseId={caseId}
              data={data}
              onInspect={(field) => {
                setComparisonField(field);
                const item = readiness.comparisons.find((item) => item.field === field);
                const source =
                  item?.observations.find(
                    (source) => source.id === item.semantic_review?.source_observation_id,
                  ) ?? item?.observations[0];
                if (source) openSource(source);
              }}
            />
            <ConsistentReviewPanel caseId={caseId} data={data} openSource={openSource} />
            <h2>{t("review.compare")}</h2>
            <p className="review-hint">{t("workbench.meaning")}</p>
            <label className="review-field-search">
              {t("integration.findField")}
              <input
                type="search"
                value={fieldSearch}
                onChange={(event) => setFieldSearch(event.target.value)}
              />
            </label>
            <div className="comparison-filters" aria-label={t("processing.filterLabel")}>
              {[
                "attention",
                ...(workspace.ai_reconciliation ? ["equivalent"] : []),
                "missing",
                "resolved",
                "all",
              ].map((filter) => (
                <button
                  key={filter}
                  aria-pressed={comparisonFilter === filter}
                  onClick={() => {
                    setComparisonFilter(filter);
                    setComparisonField("");
                    setFieldSearch("");
                  }}
                >
                  {t(`processing.filters.${filter}`)}
                </button>
              ))}
            </div>
            <div className="harbor-issue-list" aria-label={t("harborApp.attention")}>
              {displayedComparisons.map((item) => (
                <button
                  key={item.field}
                  className={`${item.field === activeComparison?.field ? "active" : ""} ${item.source_values_differ && !item.resolved ? "has-source-conflict" : ""}`}
                  aria-pressed={item.field === activeComparison?.field}
                  onClick={() => {
                    setComparisonField(item.field);
                    const source = item.observations[0];
                    if (source) openSource(source);
                    else setHighlight(null);
                  }}
                >
                  {!arithmeticMismatch(item.field) && (item.resolved || item.status === "MATCH") ? (
                    <Check size={16} />
                  ) : (
                    <CircleAlert size={16} />
                  )}
                  <span>
                    <small>{fieldLabel(item.field)}</small>
                    <strong>{t(comparisonStatusKey(item))}</strong>
                    {item.source_values_differ && !item.resolved && (
                      <span className="issue-value-preview">
                        {[
                          ...new Set(
                            item.observations.map((source) =>
                              `${source.normalized} ${source.unit}`.trim(),
                            ),
                          ),
                        ]
                          .slice(0, 3)
                          .join(" / ")}
                      </span>
                    )}
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
            {!displayedComparisons.length && (
              <p className="review-hint">{t("processing.filterEmpty")}</p>
            )}
            {(activeComparison ? [activeComparison] : []).map((comparison) => (
              <article className="review-comparison" key={comparison.field}>
                <div className="review-section-heading">
                  <h3>{fieldLabel(comparison.field)}</h3>
                  <span className={`review-status status-${comparison.status.toLowerCase()}`}>
                    {t(comparisonStatusKey(comparison))}
                  </span>
                </div>
                {comparison.source_values_differ && !comparison.resolved && (
                  <aside className="review-source-conflict" role="status">
                    <strong>{t("processing.sourceConflict")}</strong>
                    <p>{t("processing.sourceConflictNotice")}</p>
                    {comparison.status === "EXTRACTION_UNCERTAIN" && (
                      <small>{t("workbench.statuses.EXTRACTION_UNCERTAIN")}</small>
                    )}
                  </aside>
                )}
                {readiness.arithmetic_checks
                  ?.filter(
                    (check) =>
                      check.status !== "NOT_COMPARABLE" &&
                      [check.result_field, ...check.factors].includes(comparison.field),
                  )
                  .map((check) => (
                    <aside
                      key={check.key}
                      className={`review-arithmetic-check ${check.status === "MISMATCH" ? "review-arithmetic-error" : ""}`}
                      role={check.status === "MISMATCH" ? "alert" : "status"}
                    >
                      <strong>{t(check.label)}</strong>
                      <p>
                        {t("integration.arithmetic.result", {
                          left: check.values?.[0],
                          right: check.values?.[1],
                          expected: check.expected,
                          actual: check.actual,
                          difference: check.difference,
                        })}
                      </p>
                    </aside>
                  ))}
                <ReconciliationSuggestion
                  caseId={caseId}
                  data={data}
                  item={comparison}
                  onPreview={openSource}
                />
                {comparison.canonical && (
                  <p className="info-note">
                    {t(
                      comparison.canonical.ai_reconciliation_id
                        ? "integration.aiConfirmedValue"
                        : comparison.canonical.source_observation_id
                          ? "integration.sourceValue"
                          : "integration.manualValue",
                    )}
                    : {comparison.canonical.value} · {comparison.canonical.reason}
                  </p>
                )}
                <CanonicalEditor
                  caseId={caseId}
                  data={data}
                  item={comparison}
                  index={readiness.comparisons.indexOf(comparison)}
                  openSource={openSource}
                  onSaved={() => setComparisonField(comparison.field)}
                />
                <SourceValuePicker
                  key={comparison.field}
                  caseId={caseId}
                  data={data}
                  item={comparison}
                  viewedSourceId={shownHighlight?.id}
                  onPreview={openSource}
                  onSaved={() => setComparisonField(comparison.field)}
                />
                {reasonInput}
                <div className="review-table-wrap comparison-values">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("review.source")}</th>
                        <th>{t("review.value")}</th>
                        <th>{t("review.selection")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.observations.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {!workspace.logical_documents?.some(
                              (source) =>
                                !source.withdrawn &&
                                source.verified &&
                                source.document_id === item.document_id &&
                                source.document_type === item.document_type &&
                                source.page_from <= item.page &&
                                source.page_to >= item.page,
                            ) && (
                              <Button
                                variant="ghost"
                                disabled={!reason.trim()}
                                onClick={() =>
                                  run(async () => {
                                    const existing = workspace.logical_documents?.find(
                                      (source) =>
                                        !source.withdrawn &&
                                        source.document_id === item.document_id &&
                                        source.document_type === item.document_type &&
                                        source.page_from <= item.page &&
                                        source.page_to >= item.page,
                                    );
                                    if (existing)
                                      return read(
                                        await api.POST(
                                          "/api/v1/cases/{case_id}/review/logical-documents/{logical_id}/verify",
                                          {
                                            params: {
                                              path: { case_id: caseId, logical_id: existing.id },
                                            },
                                            body: { revision, reason },
                                          },
                                        ),
                                      );
                                    return read(
                                      await api.POST(
                                        "/api/v1/cases/{case_id}/review/logical-documents",
                                        {
                                          params: { path: { case_id: caseId } },
                                          body: {
                                            revision,
                                            document_id: item.document_id,
                                            document_type: item.document_type,
                                            page_from: item.page,
                                            page_to: item.page,
                                            reason,
                                          },
                                        },
                                      ),
                                    );
                                  })
                                }
                              >
                                {t("integration.classifySource")}
                              </Button>
                            )}
                            <Button variant="ghost" onClick={() => openSource(item)}>
                              {item.document_type} · {t("review.page")} {item.page}
                            </Button>
                            <small>
                              {documents.find((source) => source.id === item.document_id)?.filename}
                            </small>
                          </td>
                          <td>
                            <strong>
                              {item.normalized} {item.unit}
                            </strong>
                            {item.source_kind === "ocr" && (
                              <small>{t("processing.ocrSource")}</small>
                            )}
                            {item.line_identity_quote && (
                              <small>
                                {t("processing.lineIdentity", { value: item.line_identity_quote })}
                              </small>
                            )}
                            {item.source_kind === "human_transcript" && (
                              <small>{t("integration.transcriptSaved")}</small>
                            )}
                            <small>
                              {t("review.raw")}: {item.quote}
                            </small>
                          </td>
                          <td>
                            <div className="review-actions">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  openSource(item);
                                  setTab("documents");
                                  setEditing(item.id);
                                  setField(item.field);
                                  setDocumentType(item.document_type);
                                  setQuote(item.quote);
                                  setQuoteOffset(item.offset);
                                  setValueType(item.value_type);
                                  setUnit(item.source_unit ?? item.unit);
                                  setLocale(item.number_locale ?? "en");
                                  setVerified(false);
                                }}
                              >
                                {t("rules.correct")}
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={!reason.trim()}
                                onClick={() =>
                                  run(() =>
                                    reviewActions.withdraw(caseId, item.id, revision, reason),
                                  )
                                }
                              >
                                {t("rules.withdraw")}
                              </Button>
                            </div>
                            {item.origin === "ai" && <small>{t("extraction.proposal")}</small>}
                            {!item.verified ? (
                              <Button
                                variant="secondary"
                                disabled={!reason.trim()}
                                onClick={() =>
                                  run(() => reviewActions.verify(caseId, item.id, revision, reason))
                                }
                              >
                                {t("review.verify")}
                              </Button>
                            ) : (
                              <Button
                                variant={
                                  comparison.selection?.observation_id === item.id
                                    ? "primary"
                                    : "secondary"
                                }
                                disabled={
                                  !reason.trim() || comparison.selection?.observation_id === item.id
                                }
                                onClick={() =>
                                  run(() =>
                                    reviewActions.select(
                                      caseId,
                                      comparison.field,
                                      item.id,
                                      revision,
                                      reason,
                                    ),
                                  )
                                }
                              >
                                {t(
                                  comparison.selection?.observation_id === item.id
                                    ? "review.selection"
                                    : "review.select",
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </section>
        )}
        {tab === "canonical" && (
          <CanonicalSheet
            caseId={caseId}
            data={data}
            openSource={openSource}
            onExport={() => setTab("export")}
          />
        )}
        {tab === "export" && (
          <section className="register review-section">
            <h2>{t("review.export")}</h2>
            <p className="review-hint">{t("review.mappingNote")}</p>
            {workspace.template ? (
              <div className="review-template-summary">
                <strong>{workspace.template.filename}</strong>
                <p>
                  {t("review.templateVersion")}: {workspace.template.version} ·{" "}
                  {t("review.mappingVersion")}: {workspace.template.mapping_version}
                </p>
                <details>
                  <summary>{t("integration.mappingDetails")}</summary>
                  <ul>
                    {workspace.template.mappings.map((item) => (
                      <li key={`${item.field}:${item.sheet}:${item.cell}`}>
                        {fieldLabel(item.field)} → {item.sheet}!{item.cell}
                        {item.required ? ` · ${t("review.required")}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : (
              <p>{t("review.noTemplate")}</p>
            )}
            {workspace.template?.profile_id && (
              <details className="review-advanced-template">
                <summary>{t("integration.adjustTemplate")}</summary>
                <TemplateProfilePanel caseId={caseId} data={data} />
              </details>
            )}
            <details className="review-advanced-template" open={!workspace.template?.profile_id}>
              <summary>{t("integration.advancedTemplate")}</summary>
              <form onSubmit={registerTemplate} className="review-form">
                <label>
                  {t("review.templateFile")}
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    required
                    onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="review-form-grid">
                  <label>
                    {t("review.templateVersion")}
                    <input
                      required
                      maxLength={80}
                      value={version}
                      onChange={(event) => setVersion(event.target.value)}
                    />
                  </label>
                  <label>
                    {t("review.mappingVersion")}
                    <input
                      required
                      maxLength={80}
                      value={mappingVersion}
                      onChange={(event) => setMappingVersion(event.target.value)}
                    />
                  </label>
                </div>
                <h3>{t("review.mapping")}</h3>
                {mappings.map((item, index) => (
                  <div className="review-mapping" key={index}>
                    <label>
                      {t("review.field")}
                      <input
                        required
                        pattern="[a-z][a-z0-9_]{0,63}"
                        value={item.field}
                        onChange={(event) => updateMapping(index, { field: event.target.value })}
                      />
                    </label>
                    <label>
                      {t("review.sheet")}
                      <input
                        required
                        maxLength={31}
                        value={item.sheet}
                        onChange={(event) => updateMapping(index, { sheet: event.target.value })}
                      />
                    </label>
                    <label>
                      {t("review.cell")}
                      <input
                        required
                        pattern="[A-Z]{1,3}[1-9][0-9]{0,6}"
                        value={item.cell}
                        onChange={(event) =>
                          updateMapping(index, { cell: event.target.value.toUpperCase() })
                        }
                      />
                    </label>
                    <label className="review-checkbox">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={(event) =>
                          updateMapping(index, { required: event.target.checked })
                        }
                      />
                      {t("review.required")}
                    </label>
                    <Button
                      variant="ghost"
                      disabled={mappings.length === 1}
                      onClick={() => setMappings((rows) => rows.filter((_, at) => at !== index))}
                    >
                      {t("review.removeMapping")}
                    </Button>
                  </div>
                ))}
                <div className="review-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setMappings((rows) => [...rows, blankMapping()])}
                    disabled={mappings.length >= 200}
                  >
                    {t("review.addMapping")}
                  </Button>
                  <Button type="submit">{t("review.saveTemplate")}</Button>
                </div>
              </form>
            </details>
            <p className="info-note">{t("rules.scope")}</p>
            <div className="review-export-gate">
              <h3>{t(readiness.eligible ? "review.ready" : "review.blocked")}</h3>
              <ul>
                {readiness.blockers.map((blocker) => {
                  const index = blocker.lastIndexOf(":");
                  const key = index < 0 ? blocker : blocker.slice(index + 1);
                  return (
                    <li key={blocker}>
                      {index < 0 ? "" : `${fieldLabel(blocker.slice(0, index))}: `}
                      {t(
                        key === "MISSING_REQUIRED" || key === "EXTRACTION_UNCERTAIN"
                          ? `workbench.statuses.${key}`
                          : `review.blockers.${key}`,
                      )}
                    </li>
                  );
                })}
              </ul>
              <ExportCoverage data={data} onReview={() => setTab("canonical")} />
              {reasonInput}
              <div className="review-actions">
                <Button
                  variant="secondary"
                  disabled={!readiness.eligible || readiness.approved || !reason.trim()}
                  onClick={() => run(() => reviewActions.approve(caseId, revision, reason))}
                >
                  {t(readiness.approved ? "review.approved" : "review.approve")}
                </Button>
                <Button
                  disabled={!readiness.approved}
                  onClick={() => run(() => reviewActions.export(caseId, revision))}
                >
                  {t("review.exportNow")}
                </Button>
              </div>
            </div>
            <section className="review-draft-export" aria-label={t("review.exportDraft")}>
              <h3>{t("review.exportDraft")}</h3>
              <p>{t("review.draftNotice")}</p>
              <Button
                variant="secondary"
                disabled={!workspace.template || !documents.some((item) => !item.withdrawn)}
                onClick={() =>
                  run(() =>
                    reviewActions.draftExport(
                      caseId,
                      revision,
                      reason.trim() || t("review.draftExportReason"),
                      i18n.resolvedLanguage?.startsWith("en") ? "en" : "vi",
                    ),
                  )
                }
              >
                {t("review.exportDraft")}
              </Button>
            </section>
            <section className="review-export-history" aria-label={t("review.exports")}>
              <h3>{t("review.exports")}</h3>
              {!exports.length && <p>{t("review.noExports")}</p>}
              <ol className="review-export-list">
                {[...exports].reverse().map((item, index) => (
                  <li key={item.id}>
                    <article className="review-export-record" data-export-id={item.id}>
                      <div className="export-file-icon" aria-hidden="true">
                        <FileSpreadsheet size={28} />
                        <span>
                          {item.filename.toLowerCase().endsWith(".xlsx") ? "XLSX" : "XLS"}
                        </span>
                      </div>
                      <div className="export-file-info">
                        <div className="export-file-status">
                          <span className={`export-kind export-kind-${item.kind}`}>
                            {t(
                              item.kind === "draft" ? "review.draftLabel" : "review.approvedLabel",
                            )}
                          </span>
                          {index === 0 && <span>{t("review.latestExport")}</span>}
                        </div>
                        <h4>{item.filename}</h4>
                        <p className="export-file-meta">
                          <time dateTime={item.at}>{date(item.at)}</time> · {t("review.revision")}{" "}
                          {item.source_revision}
                        </p>
                        {item.kind === "draft" && !!item.blockers_snapshot?.length && (
                          <p className="export-file-warning">
                            {t("review.draftPendingCount", {
                              count: item.blockers_snapshot.length,
                            })}
                          </p>
                        )}
                        {!!item.missing_fields?.length && (
                          <p className="export-file-warning">
                            {t("integration.exportMissingCount", {
                              count: item.missing_fields.length,
                            })}
                          </p>
                        )}
                        <details className="export-file-details">
                          <summary>{t("review.exportDetails")}</summary>
                          <dl>
                            <dt>{t("review.templateVersion")}</dt>
                            <dd>{item.template_version}</dd>
                            <dt>{t("review.mappingVersion")}</dt>
                            <dd>{item.mapping_version}</dd>
                          </dl>
                        </details>
                      </div>
                      <a
                        className="button button-primary export-file-download"
                        href={reviewFileUrl(caseId, "exports", item.id)}
                        download={item.filename}
                        aria-label={`${t("review.download")} · ${item.filename}`}
                      >
                        <Download size={19} aria-hidden="true" />
                        {t("review.download")}
                      </a>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          </section>
        )}
        {tab === "audit" && (
          <section className="register review-section">
            <h2>{t("review.audit")}</h2>
            <AITracePanel caseId={caseId} data={data} />
            <p className="review-hint">{t("review.localActor")}</p>
            {(workspace.observations ?? [])
              .filter((item) => item.state && item.state !== "active")
              .map((item) => (
                <article className="review-comparison" key={item.id}>
                  <strong>
                    {item.field}: {item.quote}
                  </strong>
                  <p>
                    {t(`rules.${item.state}`)} · {item.change_reason}
                  </p>
                  <Button variant="ghost" onClick={() => openSource(item)}>
                    {t("review.openSource")}
                  </Button>
                </article>
              ))}
            {!audit.length && <p>{t("review.emptyAudit")}</p>}
            {!!audit.length && (
              <nav className="canonical-pagination" aria-label={t("integration.auditPages")}>
                <span role="status">
                  {t("cases.page", { page: currentAuditPage + 1, pages: auditPages })}
                </span>
                <div>
                  <Button
                    variant="ghost"
                    disabled={!currentAuditPage}
                    onClick={() => setAuditPage(currentAuditPage - 1)}
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={currentAuditPage + 1 >= auditPages}
                    onClick={() => setAuditPage(currentAuditPage + 1)}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </nav>
            )}
            <ol className="review-audit">
              {[...audit]
                .reverse()
                .slice(currentAuditPage * 25, (currentAuditPage + 1) * 25)
                .map((item) => (
                  <li key={item.id}>
                    <time dateTime={item.at}>{date(item.at)}</time>
                    <strong>{t(`review.events.${item.action}`)}</strong>
                    <p>{item.detail}</p>
                  </li>
                ))}
            </ol>
          </section>
        )}
        {["compare", "canonical"].includes(tab) && (
          <aside className="source-dock" aria-label={t("harborApp.sourcePreview")}>
            {tab === "compare" && activeComparison && (
              <EvidenceSourceSwitcher
                key={activeComparison.field}
                fieldLabel={fieldLabel(activeComparison.field)}
                observations={activeComparison.observations}
                documents={documents}
                selectedId={shownHighlight?.id}
                onSelect={openSource}
              />
            )}
            <div className="source-dock-header">
              <span>
                <FileText size={15} />{" "}
                {shownHighlight ? doc?.filename : t("harborApp.sourcePreview")}
              </span>
              {shownHighlight && doc && (
                <a
                  href={`${reviewFileUrl(caseId, "documents", doc.id)}#page=${page}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("review.openOriginal")}
                >
                  <ArrowUpRight size={17} />
                </a>
              )}
            </div>
            {shownHighlight?.source_kind === "ocr" && (
              <p className="info-note">{t("processing.ocrSource")}</p>
            )}
            {shownHighlight?.source_kind === "human_transcript" && (
              <p className="info-note">{t("integration.transcriptSaved")}</p>
            )}
            {shownHighlight && (
              <pre className="review-source-text selected-source-quote">
                <mark>{shownHighlight.quote}</mark>
              </pre>
            )}
            <div
              className="source-dock-document"
              key={`${doc?.id}:${page}:${shownHighlight?.id ?? ""}`}
              role="region"
              aria-label={t("review.scrollDocument")}
              tabIndex={0}
            >
              {shownHighlight && doc ? (
                <Suspense fallback={<p className="source-dock-empty">{t("common.loading")}</p>}>
                  <PdfPreview
                    url={reviewFileUrl(caseId, "documents", doc.id)}
                    pageNumber={page}
                    quote={shownHighlight?.quote ?? ""}
                    ocrPage={
                      shownHighlight?.source_kind === "ocr" ? doc.ocr_pages?.[page] : undefined
                    }
                    sourceOffset={shownHighlight?.offset}
                  />
                </Suspense>
              ) : (
                <p className="source-dock-empty">{t("harborApp.chooseEvidence")}</p>
              )}
            </div>
          </aside>
        )}
      </fieldset>
    </div>
  );
}
