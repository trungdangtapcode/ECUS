import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { canonicalFields } from '../config/forms';
import { copy } from '../lib/copy';
import { useStudio } from '../state/StudioContext';
import { Modal } from '../components/ui';
import { SourceDocument } from '../components/SourceDocument';
import { SelectField } from '../components/SelectField';
import type { DocumentKind } from '../data/cases';

export function Consolidation() {
  const { record, data, updateDraft, selectSource, navigate, draftIssues } = useStudio();
  const [preview, setPreview] = useState<DocumentKind | null>(null);
  const draft = data.drafts[record.id];

  return (
    <div className="canonical-workspace">
      <div className="canonical-layout">
        <section className="canonical-sheet" aria-label={copy.consolidation}>
          <header className="canonical-columns">
            <h2>{copy.value}</h2>
            <span>{copy.source}</span>
          </header>
          {canonicalFields.map((field, index) => {
            const selection = data.selections[record.id]?.[field.key];
            const source = record.documents.find(
              (document) => document.id === selection?.documentId,
            );
            return (
              <section
                className="canonical-entry"
                key={field.key}
                aria-labelledby={`label-${field.key}`}
              >
                <div className="canonical-value-column">
                  <span className="canonical-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="canonical-value">
                    <label id={`label-${field.key}`} htmlFor={`canonical-${field.key}`}>
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`canonical-${field.key}`}
                        rows={3}
                        value={draft[field.key]}
                        onChange={(event) => updateDraft({ [field.key]: event.target.value })}
                      />
                    ) : (
                      <div className="canonical-amount">
                        <input
                          id={`canonical-${field.key}`}
                          inputMode="decimal"
                          value={draft[field.key]}
                          onChange={(event) => updateDraft({ [field.key]: event.target.value })}
                        />
                        <span>{field.key === 'quantity' ? record.unit : 'USD'}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="canonical-provenance">
                  <SelectField
                    label={`${copy.source}: ${field.label}`}
                    value={selection?.documentId || 'unselected'}
                    onValueChange={(documentId) =>
                      selectSource(field.key, {
                        documentId: documentId === 'unselected' ? '' : documentId,
                        reason: selection?.reason ?? '',
                      })
                    }
                    options={[
                      { value: 'unselected', label: copy.unresolvedSource },
                      ...record.documents.map((document) => ({
                        value: document.id,
                        label: document.title,
                        description: document.ref,
                      })),
                    ]}
                  />
                  <div className="canonical-reference-line">
                    <span>{source?.ref ?? '—'}</span>
                    <button
                      type="button"
                      disabled={!source}
                      onClick={() => source && setPreview(source.kind)}
                    >
                      {copy.openEvidence}
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <label className="canonical-reason-label" htmlFor={`reason-${field.key}`}>
                    {copy.reason}
                  </label>
                  <textarea
                    id={`reason-${field.key}`}
                    className="canonical-reason"
                    rows={2}
                    value={selection?.reason ?? ''}
                    placeholder={copy.reasonHint}
                    onChange={(event) =>
                      selectSource(field.key, {
                        documentId: selection?.documentId ?? '',
                        reason: event.target.value,
                      })
                    }
                  />
                </div>
              </section>
            );
          })}
          {!!draftIssues.length && (
            <div className="canonical-validation" role="status">
              <strong>{copy.fieldCheck}</strong>
              <p>{draftIssues.join(', ')}</p>
            </div>
          )}
          <footer className="canonical-actions">
            <p>{copy.sampleEvidence}</p>
            <button className="canonical-review-button" onClick={() => navigate('review')}>
              {copy.review}
              <ArrowRight size={17} />
            </button>
          </footer>
        </section>
        <aside className="canonical-source-index" aria-labelledby="canonical-sources-heading">
          <h2 id="canonical-sources-heading">
            {copy.source}
            <span>{record.documents.length}</span>
          </h2>
          <ol>
            {record.documents.map((document, index) => (
              <li key={document.id}>
                <button
                  onClick={() => setPreview(document.kind)}
                  aria-label={`${copy.openEvidence}: ${document.title}`}
                >
                  <span className="canonical-document-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <strong>{document.title}</strong>
                    <small>{document.ref}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              </li>
            ))}
          </ol>
          {!record.documents.length && <p>{copy.unresolvedSource}</p>}
          <p className="canonical-source-note">{copy.meaning}</p>
        </aside>
      </div>
      {preview && (
        <Modal title={copy.openEvidence} onClose={() => setPreview(null)} wide>
          <SourceDocument kind={preview} />
        </Modal>
      )}
    </div>
  );
}
