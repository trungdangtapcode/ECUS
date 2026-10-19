export const motionSettings = {
  enter: { duration: 0.58, ease: [0.22, 1, 0.36, 1] as const },
  spring: { type: "spring" as const, stiffness: 360, damping: 30, mass: 0.9 },
  stagger: 0.075,
  travel: 36,
  lift: 28,
  hoverLift: -4,
  hoverInset: 0.985,
  pressScale: 0.97,
};

// The approved Harbor presentation. Business state belongs to feature modules.
export const designs = {
  harbor: {
    name: "Harbor",
    tokens: {
      accent: "#26766b",
      accentSoft: "#edf5f2",
      secondary: "#dd967a",
      secondarySoft: "#faeee5",
      canvas: "#f6f7f4",
      surface: "#ffffff",
      ink: "#29343d",
      muted: "#65717a",
      border: "#e2e6e8",
      nav: "#ffffff",
      navInk: "#5c6972",
      artBase: "#eaf0e8",
      artGlow: "#dd967a",
      artPaper: "#fffdf6",
      artHighlight: "#f5e4c7",
      radius: "9px",
      headingFont: '"Be Vietnam Pro", sans-serif',
      density: "16px",
      spaceInline: "8px",
      spaceGroup: "16px",
      spaceSection: "24px",
      panelInset: "clamp(16px, 2vw, 28px)",
      motionFast: "180ms",
      motionEnter: `${motionSettings.enter.duration * 1000}ms`,
      motionStagger: `${motionSettings.stagger * 1000}ms`,
      motionEase: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  },
} as const;
export const defaultDesign = "harbor";
export type DesignId = typeof defaultDesign;
export type DesignTokens = typeof designs.harbor.tokens;
