import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CircleHelp, FileCheck2, PanelLeftClose, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation, useMatch, useSearchParams } from "react-router-dom";
import { supportedLocales } from "../lib/i18n";
import { navigation } from "./navigation";
import { CargoArtwork } from "../design/harbor/cargo-artwork";
import { CompassRose } from "../design/harbor/maritime-details";
import { TabIndicator } from "../design/motion";
import { useEnterMotion, useMotionRecipe } from "../design/motion-hooks";

function Guide({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const effects = useMotionRecipe();
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <motion.dialog
      className="case-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="guide-title"
      {...effects.reveal()}
    >
      <div className="dialog-heading">
        <h2 id="guide-title">{t("harborApp.helpTitle")}</h2>
        <button className="icon-button" onClick={onClose} aria-label={t("common.close")}>
          <X size={20} />
        </button>
      </div>
      <ol className="help-steps">
        {(t("harborApp.helpSteps", { returnObjects: true }) as string[]).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </motion.dialog>
  );
}

export function Layout() {
  const { t, i18n } = useTranslation();
  const activeCase = useMatch("/cases/:caseId/*")?.params.caseId;
  const [search] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [help, setHelp] = useState(false);
  const section = search.get("section") ?? "documents";
  const { pathname } = useLocation();
  const content = useEnterMotion<HTMLElement>(
    `${pathname}:${section}:${search.get("view") ?? ""}`,
    true,
  );
  const label = activeCase
    ? `harborApp.${section === "rules" || section === "audit" ? "overview" : section}`
    : "harborApp.overview";
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("navigation.skip")}
      </a>
      <div className={`workspace layout-harbor ${collapsed ? "nav-collapsed" : ""}`}>
        <motion.aside className="sidebar" layout="size">
          <Link to="/" className="sidebar-brand" aria-label={t("harborApp.intro")}>
            <span className="brand-mark">
              <FileCheck2 size={23} />
            </span>
            <div>
              <strong>
                {t("harborApp.brand")}
                <span>.</span>
              </strong>
              <small>{t("harborApp.brandCaption")}</small>
            </div>
          </Link>
          <nav className="workspace-nav" aria-label={t("app.workspace")}>
            {navigation.map((entry) => {
              const name = entry.route ? t("harborApp.overview") : t(`harborApp.${entry.section}`);
              const icon = (
                <span className="nav-icon">
                  <entry.icon size={19} />
                </span>
              );
              return entry.route ? (
                <NavLink key={entry.id} to={entry.route} end title={name}>
                  {({ isActive }) => (
                    <>
                      {isActive && <TabIndicator id="workspace-navigation" navigation />}
                      {icon}
                      <span>{name}</span>
                    </>
                  )}
                </NavLink>
              ) : activeCase ? (
                <Link
                  key={entry.id}
                  to={`/cases/${activeCase}/review?section=${entry.section}`}
                  className={section === entry.section ? "active" : ""}
                  aria-current={section === entry.section ? "page" : undefined}
                  title={name}
                >
                  {section === entry.section && (
                    <TabIndicator id="workspace-navigation" navigation />
                  )}
                  {icon}
                  <span>{name}</span>
                </Link>
              ) : (
                <button key={entry.id} disabled title={t("harborApp.unselected")} aria-label={name}>
                  {icon}
                  <span>{name}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-illustration" aria-hidden="true">
            <CompassRose />
            <CargoArtwork />
            <span>{t("studioVisual.sourceTrail")}</span>
            <small>{t("studioVisual.reviewNote")}</small>
          </div>
          <div className="sidebar-bottom">
            <button
              className="help-button"
              onClick={() => setHelp(true)}
              aria-label={t("harborApp.help")}
            >
              <CircleHelp size={18} />
              <span>{t("harborApp.help")}</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={t("harborApp.collapse")}
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        </motion.aside>
        <div className="workspace-main">
          <header className="app-topbar">
            <div className="breadcrumbs">
              {t("app.workspace")}
              <span>/</span>
              <strong>{t(label)}</strong>
            </div>
            <div className="topbar-right">
              <select
                className="language-select"
                aria-label={t("app.language")}
                value={i18n.resolvedLanguage}
                onChange={(event) => void i18n.changeLanguage(event.target.value)}
              >
                {supportedLocales.map((locale) => (
                  <option key={locale} value={locale}>
                    {new Intl.DisplayNames([locale], { type: "language" }).of(locale)}
                  </option>
                ))}
              </select>
            </div>
          </header>
          <main id="main-content" className="page-content" tabIndex={-1} ref={content}>
            <Outlet />
          </main>
          <footer className="workspace-footer">
            <span>
              <FileCheck2 size={13} />
              {t("harborApp.brandCaption")}
            </span>
            <span>{t("app.footer")}</span>
          </footer>
        </div>
      </div>
      {help && <Guide onClose={() => setHelp(false)} />}
    </>
  );
}
