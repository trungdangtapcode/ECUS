import { createContext, useContext } from "react";
import type { DesignId, DesignTokens } from "./registry";

export interface DesignContextValue {
  id: DesignId;
  tokens: DesignTokens;
  path: (destination: string) => string;
}
export const DesignContext = createContext<DesignContextValue | null>(null);
export function useDesign(): DesignContextValue {
  const context = useContext(DesignContext);
  if (!context) throw new Error("DesignProvider is required");
  return context;
}
