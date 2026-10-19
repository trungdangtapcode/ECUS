import { createContext, useContext } from "react";

export const ReducedMotionContext = createContext(false);
export const useMotionPreference = () => useContext(ReducedMotionContext);
