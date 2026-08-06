import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { DesignContext } from "./context";
import { defaultDesign, designs } from "./registry";
import "./harbor/shell.css";
import "./harbor/overview.css";
import "./harbor/art.css";
import "./harbor/landing.css";
import "./harbor/consolidation.css";
import "./harbor/documents.css";
import "./harbor/product.css";

const tokens = designs.harbor.tokens;
const variables = Object.fromEntries(
  Object.entries(tokens).map(([key, value]) => [
    `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    value,
  ]),
);
const style = {
  ...variables,
  "--ui-accent": tokens.accent,
  "--ui-accent-ink": "#ffffff",
  "--ui-accent-soft": tokens.accentSoft,
  "--ui-canvas": tokens.canvas,
  "--ui-surface": tokens.surface,
  "--ui-ink": tokens.ink,
  "--ui-muted": tokens.muted,
  "--ui-border": tokens.border,
  "--ui-navigation": tokens.nav,
  "--ui-navigation-ink": tokens.navInk,
  "--ui-radius": tokens.radius,
  "--ui-spacing": tokens.density,
  "--ui-heading-font": tokens.headingFont,
} as CSSProperties;

export function DesignProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useSearchParams();
  const { pathname } = useLocation();
  // Old bookmarks remain usable; studio preferences cannot override the product.
  useEffect(() => {
    if (search.has("design"))
      setSearch(
        (previous) => {
          previous.delete("design");
          return previous;
        },
        { replace: true },
      );
  }, [search, setSearch]);
  const section = search.get("section") ?? "documents";
  const screen =
    pathname === "/cases"
      ? "overview"
      : ({ compare: "reconcile", canonical: "consolidation", export: "review" }[section] ??
        section);
  return (
    <DesignContext.Provider
      value={{
        id: defaultDesign,
        tokens,
        path: (destination) => {
          const url = new URL(destination, window.location.origin);
          url.searchParams.delete("design");
          return `${url.pathname}${url.search}${url.hash}`;
        },
      }}
    >
      <div
        className="design-root theme-root"
        data-design="harbor"
        data-theme="harbor"
        data-screen={screen}
        style={style}
      >
        {children}
      </div>
    </DesignContext.Provider>
  );
}
