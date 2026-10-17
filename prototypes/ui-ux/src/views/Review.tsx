import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Download,
  FileSpreadsheet,
  LockKeyhole,
} from 'lucide-react';
import { useStudio } from '../state/StudioContext';
import { copy } from '../lib/copy';
import { canonicalFields } from '../config/forms';
import { Badge, Button, Callout, Panel, SectionTitle } from '../components/ui';

export function Review() {
  const productUrl = import.meta.env.VITE_PRODUCT_URL as string | undefined;
  const { record, design, data, unresolved, draftIssues, navigate, revision } = useStudio();
  const missingSources = canonicalFields.some(
    (field) => !data.selections[record.id]?.[field.key]?.documentId,
  );
  const checks = [
    {
      title: copy.issueCheck,
      detail: String(unresolved.length),
      done: unresolved.length === 0,
      screen: 'reconcile' as const,
    },
    {
      title: copy.fieldCheck,
      detail:
        draftIssues.join(', ') || (missingSources ? copy.unresolvedSource : copy.sampleEvidence),
      done: draftIssues.length === 0 && !missingSources,
      screen: 'consolidation' as const,
    },
    {
      title: copy.sourceCheck,
      detail: copy.sampleEvidence,
      done: false,
      screen: 'documents' as const,
    },
    { title: copy.templateCheck, detail: copy.pendingMapping, done: false, screen: null },
    { title: copy.serverCheck, detail: copy.backendPending, done: false, screen: null },
  ];
  const events = data.audit
    .filter((event) => event.caseId === record.id)
    .slice()
    .reverse();
  return (
    <div className="review-layout">
      <div>
        <Panel className="readiness-banner">
          <span className="readiness-icon">
            <FileSpreadsheet size={34} />
          </span>
          <div>
            <span className="eyebrow">
              {copy.revision} {revision}
            </span>
            <h2>{copy.exportBlocked}</h2>
            <p>{copy.exportDescription}</p>
          </div>
          <Badge tone="warning">{copy.backendPending}</Badge>
        </Panel>
        <Panel className="review-checks">
          <SectionTitle title={copy.review} />
          {checks.map((check) => (
            <div className="review-check" key={check.title}>
              <span className={`check-circle ${check.done ? 'done' : ''}`}>
                <CircleAlert size={17} />
              </span>
              <div>
                <strong>{check.title}</strong>
                <p>{check.detail}</p>
              </div>
              {check.screen && (
                <button className="text-button" onClick={() => navigate(check.screen!)}>
                  {copy.openEvidence}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          ))}
          <Callout>
            <LockKeyhole size={16} />
            {copy.backendNote}
          </Callout>
          {productUrl && (
            <Callout>
              <p>{copy.productNote}</p>
              <a
                className="text-button"
                href={`${productUrl.replace(/\/$/, '')}/cases?design=${design}`}
                target="_blank"
                rel="noreferrer"
              >
                {copy.openProduct}
                <ArrowRight size={15} />
              </a>
            </Callout>
          )}
          <div className="panel-bottom">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('consolidation')}>
              {copy.back}
            </Button>
            <Button icon={Download} disabled>
              {copy.exportExcel}
            </Button>
          </div>
        </Panel>
        <Panel className="audit-panel">
          <SectionTitle title={copy.audit} />
          <p className="subtle">{copy.localAudit}</p>
          {events.length ? (
            <ol className="audit-list">
              {events.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.at}>
                    {new Intl.DateTimeFormat('vi', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(event.at))}
                  </time>
                  <div>
                    <strong>{copy[event.action as 'updated'] ?? event.action}</strong>
                    <p>{event.detail}</p>
                    <small>{copy.localActor}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="subtle">{copy.noEvents}</p>
          )}
        </Panel>
      </div>
      <aside className="review-aside">
        <Panel>
          <SectionTitle title={copy.template} />
          <dl className="metadata-list">
            {[copy.template, copy.templateVersion, copy.mappingVersion].map((label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>—</dd>
              </div>
            ))}
          </dl>
          <Callout tone="warning">{copy.pendingMapping}</Callout>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{copy.field}</th>
                  <th>{copy.sheet}</th>
                  <th>{copy.cell}</th>
                </tr>
              </thead>
              <tbody>
                {canonicalFields.map((field) => (
                  <tr key={field.key}>
                    <td>{field.label}</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="subtle">{copy.mappingNote}</p>
        </Panel>
        <Panel>
          <SectionTitle title={copy.exportHistory} />
          <p className="subtle">{copy.noExports}</p>
        </Panel>
      </aside>
    </div>
  );
}
