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
    },
  },
} as const;
export const defaultDesign = "harbor";
export type DesignId = typeof defaultDesign;
export type DesignTokens = typeof designs.harbor.tokens;
