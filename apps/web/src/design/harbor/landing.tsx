import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, FileCheck2, MoveDown } from "lucide-react";
import type vi from "../../locales/vi.json";
import { casesQuery } from "../../features/cases/queries";
import { reviewQuery } from "../../features/review/queries";
import { ErrorState } from "../../components/error-state";
import { media } from "./media";
import { CompassRose, RouteOrbits } from "./maritime-details";
import { CargoArtwork } from "./cargo-artwork";
import { useEnterMotion, useMotionRecipe, useScrollReveal } from "../motion-hooks";

export function Landing() {
  const { t } = useTranslation();
  const text = t("studioLanding", { returnObjects: true }) as typeof vi.studioLanding;
  const copy = t("workbench", { returnObjects: true }) as typeof vi.workbench;
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const effects = useMotionRecipe();
  const stepDetail = useEnterMotion<HTMLDivElement>(step);
  const sections = useScrollReveal<HTMLElement>();
  const [sampleId, setSampleId] = useState("");
  const casesQueryResult = useQuery(casesQuery(0));
  const cases = casesQueryResult.data?.items ?? [];
  const sample = cases.find((item) => item.id === sampleId) ?? cases[0];
  const evidence = useQuery({ ...reviewQuery(sample?.id ?? ""), enabled: !!sample });
  const issue = evidence.data?.readiness.comparisons[0];
  const title = text.harborTitle;
  const accent = text.harborAccent;
  return (
    <div className="landing landing-harbor">
      <header className="landing-nav">
        <a className="landing-brand" href="/">
          <FileCheck2 size={25} />
          <span>
            precheck<span className="landing-brand-dot">.</span>
            <small>{t("harborApp.brandCaption")}</small>
          </span>
        </a>
        <nav aria-label={text.landing}>
          <a href="#workflow">{text.navWorkflow}</a>
          <a href="#examples">{text.navExamples}</a>
          <a href="#principles">{text.navPrinciples}</a>
        </nav>
        <button className="landing-nav-action" onClick={() => void navigate("/cases")}>
          {text.workspace}
          <ArrowUpRight size={16} />
        </button>
      </header>
      <main className="landing-main" id="main-content" ref={sections}>
        <section className="landing-hero">
          <motion.div className="landing-hero-copy" {...effects.reveal()}>
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
              <button className="landing-primary" onClick={() => void navigate("/cases")}>
                {text.primary}
                <ArrowUpRight size={18} />
              </button>
              <a className="landing-text-link" href="#examples">
                {text.secondary}
                <MoveDown size={15} />
              </a>
            </div>
            <p className="landing-demo-note">{text.demoNote}</p>
          </motion.div>
          <motion.div className="landing-hero-art" {...effects.reveal(2)}>
            {
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
                  {text.steps[0]!.detail}
                  <ArrowUpRight size={16} />
                </div>
              </>
            }
          </motion.div>
        </section>
        <div className="landing-document-belt">
          <p>{text.documentsLabel}</p>
          <div>
            {[text.invoice, text.packing, text.bill, text.arrival, text.origin].map(
              (label, index) => (
                <span key={label}>
                  <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
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
                      event.key === "ArrowRight"
                        ? (index + 1) % text.steps.length
                        : event.key === "ArrowLeft"
                          ? (index + text.steps.length - 1) % text.steps.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? text.steps.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      setStep(next);
                      document.getElementById(`step-${next}`)?.focus();
                    }
                  }}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.title}</strong>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
            <div
              className="landing-step-detail"
              ref={stepDetail}
              id="step-detail"
              role="tabpanel"
              aria-labelledby={`step-${step}`}
              tabIndex={0}
            >
              <span className="step-watermark" aria-hidden="true">
                {String(step + 1).padStart(2, "0")}
              </span>
              <h3>{text.steps[step]!.detail}</h3>
              <p>{text.steps[step]!.description}</p>
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
                  aria-pressed={sample?.id === item.id}
                  onClick={() => setSampleId(item.id)}
                >
                  {item.title}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <article className="landing-evidence" aria-live="polite">
            <div className="evidence-topline">
              <span>{text.exampleLabel}</span>
              <span>{sample?.procedure}</span>
            </div>
            {casesQueryResult.isError ? (
              <ErrorState
                error={casesQueryResult.error}
                onRetry={() => void casesQueryResult.refetch()}
              />
            ) : evidence.isError ? (
              <ErrorState error={evidence.error} onRetry={() => void evidence.refetch()} />
            ) : (
              <>
                <p className="evidence-case">
                  {sample?.title} {sample && `· ${sample.reference}`}
                </p>
                {issue ? (
                  <>
                    <h3>{issue.field}</h3>
                    <span className="evidence-status" data-status={issue.status}>
                      {copy.statuses[issue.status]}
                    </span>
                    <div className="landing-value-pair">
                      {issue.observations.slice(0, 2).map((item) => (
                        <div key={item.id}>
                          <small>
                            {item.document_type} · {t("review.page")} {item.page}
                          </small>
                          <strong>
                            {item.normalized} {item.unit}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="evidence-explanation">
                    {t(
                      casesQueryResult.isPending || (sample && evidence.isPending)
                        ? "common.loading"
                        : "harborApp.evidenceEmpty",
                    )}
                  </p>
                )}
                <button
                  className="landing-text-link"
                  onClick={() =>
                    void navigate(sample ? `/cases/${sample.id}/review?section=compare` : "/cases")
                  }
                >
                  {sample ? text.exampleAction : text.workspace}
                  <ArrowUpRight size={17} />
                </button>
              </>
            )}
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
          <button className="landing-primary" onClick={() => void navigate("/cases")}>
            {text.workspace}
            <ArrowUpRight size={18} />
          </button>
        </section>
      </main>
      <footer className="landing-footer">
        <span>precheck. / {t("harborApp.brandCaption")}</span>
        <p>{text.footer}</p>
        <button onClick={() => void navigate("/cases")}>
          {text.workspace}
          <ArrowRight size={15} />
        </button>
      </footer>
    </div>
  );
}
