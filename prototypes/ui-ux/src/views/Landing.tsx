import { useState } from 'react';
import { ArrowRight, ArrowUpRight, FileCheck2, MoveDown } from 'lucide-react';
import { useStudio } from '../state/StudioContext';
import { cases } from '../data/cases';
import { comparisonsFor } from '../domain/comparison';
import { landingCopy as text, copy } from '../lib/copy';
import { media } from '../config/media';
import { getDesign } from '../config/designs';
import {
  ArchiveMark,
  CompassRose,
  DocumentSculpture,
  RouteOrbits,
} from '../components/MaritimeDetails';
import { CargoArtwork } from '../components/CargoArtwork';

export function Landing() {
  const { design, navigate, selectCase, selectDesign } = useStudio();
  const [step, setStep] = useState(0);
  const [sampleId, setSampleId] = useState(cases[0].id);
  const sample = cases.find((item) => item.id === sampleId)!;
  const issue = comparisonsFor(sample)[0];
  const theme = design!;
  const title =
    theme === 'harbor'
      ? text.harborTitle
      : theme === 'control'
        ? text.controlTitle
        : text.ledgerTitle;
  const accent =
    theme === 'harbor'
      ? text.harborAccent
      : theme === 'control'
        ? text.controlAccent
        : text.ledgerAccent;
  return (
    <div className={`landing landing-${theme}`}>
      <header className="landing-nav">
        <a className="landing-brand" href={`?design=${theme}&screen=landing`}>
          <FileCheck2 size={25} />
          <span>
            precheck<span className="landing-brand-dot">.</span>
            <small>{getDesign(theme).name}</small>
          </span>
        </a>
        <nav aria-label={text.landing}>
          <a href="#workflow">{text.navWorkflow}</a>
          <a href="#examples">{text.navExamples}</a>
          <a href="#principles">{text.navPrinciples}</a>
        </nav>
        <button className="landing-nav-action" onClick={() => navigate('overview')}>
          {text.workspace}
          <ArrowUpRight size={16} />
        </button>
      </header>
      <main className="landing-main" id="main-content">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">
              <span />
              {text.tagline}
            </p>
            <h1>
              {title}
              <em>{accent}</em>
            </h1>
            <p className="landing-lead">{text.intro}</p>
            <div className="landing-actions">
              <button className="landing-primary" onClick={() => navigate('overview')}>
                {text.primary}
                <ArrowUpRight size={18} />
              </button>
              <a className="landing-text-link" href="#examples">
                {text.secondary}
                <MoveDown size={15} />
              </a>
            </div>
            <p className="landing-demo-note">{text.demoNote}</p>
          </div>
          <div className="landing-hero-art">
            {theme === 'harbor' && (
              <>
                <div className="landing-port">
                  <img src={media.harborCover.src} alt="" />
                  <a href={media.harborCover.source} target="_blank" rel="noreferrer">
                    {media.harborCover.credit}
                  </a>
                </div>
                <CompassRose />
                <CargoArtwork />
                <RouteOrbits />
                <div className="landing-floating-label">
                  <span>01 / 05</span>
                  {text.steps[0].detail}
                  <ArrowUpRight size={16} />
                </div>
              </>
            )}
            {theme === 'control' && (
              <>
                <div className="landing-aurora" aria-hidden="true" />
                <RouteOrbits />
                <DocumentSculpture />
                <span className="landing-orbit-label orbit-label-one">{text.invoice}</span>
                <span className="landing-orbit-label orbit-label-two">{text.packing}</span>
                <span className="landing-orbit-label orbit-label-three">{text.bill}</span>
                <span className="landing-art-caption">{text.artCaption}</span>
              </>
            )}
            {theme === 'ledger' && (
              <div className="landing-folio">
                <div className="folio-top">
                  <span>{text.paperTitle}</span>
                  <span>01 / 03</span>
                </div>
                <h2>{text.paperSubtitle}</h2>
                <span className="folio-rule" />
                <dl>
                  <div>
                    <dt>{text.paperField}</dt>
                    <dd>{issue.field}</dd>
                  </div>
                  <div>
                    <dt>{text.paperSource}</dt>
                    <dd>{issue.labels[0]}</dd>
                  </div>
                  <div>
                    <dt>{text.paperValue}</dt>
                    <dd>{issue.values[0]}</dd>
                  </div>
                </dl>
                <ArchiveMark />
                <CargoArtwork />
                <span className="folio-caption">{text.sampleLabel}</span>
              </div>
            )}
          </div>
        </section>
        <div className="landing-document-belt">
          <p>{text.documentsLabel}</p>
          <div>
            {[text.invoice, text.packing, text.bill, text.arrival, text.origin].map(
              (label, index) => (
                <span key={label}>
                  <i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
        <section className="landing-workflow landing-section" id="workflow">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">{text.workflowEyebrow}</p>
            <h2>{text.workflowTitle}</h2>
            <p>{text.workflowIntro}</p>
          </div>
          <div className="landing-process">
            <div className="landing-step-tabs" role="tablist" aria-label={text.navWorkflow}>
              {text.steps.map((item, index) => (
                <button
                  key={item.title}
                  id={`step-${index}`}
                  role="tab"
                  aria-selected={step === index}
                  aria-controls="step-detail"
                  tabIndex={step === index ? 0 : -1}
                  onClick={() => setStep(index)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === 'ArrowRight'
                        ? (index + 1) % text.steps.length
                        : event.key === 'ArrowLeft'
                          ? (index + text.steps.length - 1) % text.steps.length
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? text.steps.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      setStep(next);
                      document.getElementById(`step-${next}`)?.focus();
                    }
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.title}</strong>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
            <div
              className="landing-step-detail"
              id="step-detail"
              role="tabpanel"
              aria-labelledby={`step-${step}`}
              tabIndex={0}
            >
              <span className="step-watermark" aria-hidden="true">
                {String(step + 1).padStart(2, '0')}
              </span>
              <h3>{text.steps[step].detail}</h3>
              <p>{text.steps[step].description}</p>
            </div>
          </div>
        </section>
        <section className="landing-examples landing-section" id="examples">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">{text.examplesEyebrow}</p>
            <h2>{text.examplesTitle}</h2>
            <p>{text.examplesIntro}</p>
            <div className="landing-sample-choices" role="group" aria-label={text.navExamples}>
              {cases.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={sampleId === item.id}
                  onClick={() => setSampleId(item.id)}
                >
                  {item.goods}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <article className="landing-evidence" aria-live="polite">
            <div className="evidence-topline">
              <span>{text.exampleLabel}</span>
              <span>{sample.type}</span>
            </div>
            <p className="evidence-case">
              {sample.customer} · {sample.code}
            </p>
            <h3>{issue.title}</h3>
            <span className="evidence-status" data-status={issue.status}>
              {copy.statuses[issue.status]}
            </span>
            <div className="landing-value-pair">
              {issue.values.map((value, index) => (
                <div key={index}>
                  <small>{issue.labels[index]}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="evidence-explanation">{issue.explanation}</p>
            <button
              className="landing-text-link"
              onClick={() => selectCase(sample.id, 'reconcile')}
            >
              {text.exampleAction}
              <ArrowUpRight size={17} />
            </button>
          </article>
        </section>
        <section className="landing-principles landing-section" id="principles">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">{text.principlesEyebrow}</p>
            <h2>{text.principlesTitle}</h2>
          </div>
          <div className="landing-principle-grid">
            {text.principles.map((item, index) => (
              <article key={item.title}>
                <span aria-hidden="true">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-closing">
          <CompassRose />
          <div>
            <h2>{text.closingTitle}</h2>
            <p>{text.closingDescription}</p>
          </div>
          <button className="landing-primary" onClick={() => navigate('overview')}>
            {text.workspace}
            <ArrowUpRight size={18} />
          </button>
        </section>
      </main>
      <footer className="landing-footer">
        <span>precheck. / {getDesign(theme).name}</span>
        <p>{text.footer}</p>
        <button onClick={() => selectDesign(undefined)}>
          {text.gallery}
          <ArrowRight size={15} />
        </button>
      </footer>
    </div>
  );
}
