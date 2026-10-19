import { useEffect, useId, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  animate,
  LayoutGroup,
  motion,
  MotionConfig,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { motionSettings } from "./registry";
import { ReducedMotionContext, useMotionPreference } from "./motion-context";

const preference = "(prefers-reduced-motion: reduce)";
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(preference);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(preference).matches,
    () => true,
  );
  const id = useId();
  return (
    <ReducedMotionContext.Provider value={reduced}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"} transition={motionSettings.spring}>
        <LayoutGroup id={id}>{children}</LayoutGroup>
      </MotionConfig>
    </ReducedMotionContext.Provider>
  );
}

export function TabIndicator({ id, navigation = false }: { id: string; navigation?: boolean }) {
  const reduced = useMotionPreference();
  return (
    <motion.span
      layoutId={id}
      className={navigation ? "motion-nav-indicator" : "motion-tab-indicator"}
      aria-hidden="true"
      transition={reduced ? { duration: 0 } : motionSettings.spring}
    />
  );
}

export function AnimatedCount({ value }: { value: number | undefined }) {
  const reduced = useMotionPreference();
  const count = useMotionValue(value === undefined ? 0 : reduced ? value : 0);
  const display = useTransform(count, (current) => String(Math.round(current)).padStart(2, "0"));
  useEffect(() => {
    if (value === undefined) return;
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { ...motionSettings.enter, duration: 0.9 });
    return () => controls.stop();
  }, [value, reduced, count]);
  return value === undefined ? <>—</> : <motion.span>{display}</motion.span>;
}
