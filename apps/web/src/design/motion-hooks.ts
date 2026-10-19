import { useEffect, useRef } from "react";
import { stagger, useAnimate } from "framer-motion";
import { useMotionPreference } from "./motion-context";
import { motionSettings } from "./registry";

export function useMotionRecipe() {
  const reduced = useMotionPreference();
  return {
    reduced,
    reveal: (index = 0, options?: { contained: boolean }) => ({
      initial: reduced
        ? (false as const)
        : options?.contained
          ? { opacity: 0, clipPath: "inset(0 0 100% 0)" }
          : { opacity: 0, y: motionSettings.lift },
      animate: options?.contained
        ? { opacity: 1, clipPath: "inset(0 0 0% 0)" }
        : { opacity: 1, y: 0 },
      transition: {
        ...motionSettings.enter,
        duration: reduced ? 0 : motionSettings.enter.duration,
        delay: reduced ? 0 : Math.min(index, 7) * motionSettings.stagger,
      },
    }),
    hover: reduced ? undefined : { y: motionSettings.hoverLift },
    hoverInset: reduced ? undefined : { scale: motionSettings.hoverInset },
    press: reduced ? undefined : { scale: motionSettings.pressScale },
  };
}

const sections = ["documents", "compare", "canonical", "export", "rules", "audit"];
function position(trigger: string | number) {
  return typeof trigger === "number"
    ? trigger
    : sections.findIndex((section) => trigger.includes(`:${section}:`));
}

// Imperative Framer animation preserves the existing feature tree and unsaved form state.
export function useEnterMotion<T extends HTMLElement>(trigger: string | number, workspace = false) {
  const [scope, animate] = useAnimate<T>();
  const reduced = useMotionPreference();
  const previous = useRef(trigger);
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const direction = position(trigger) < position(previous.current) ? -1 : 1;
    previous.current = trigger;
    const elements = workspace
      ? [
          ...root.querySelectorAll<HTMLElement>(
            ":scope > .page-heading, :scope > .back-link, :scope > .detail-card, .overview-register > .shipment-cover, .overview-register > .register-totals, .overview-register > .register-body, .review-fieldset > section",
          ),
        ]
      : [root];
    if (!elements.length) return;
    root.setAttribute("data-motion-state", reduced ? "idle" : "running");
    root.setAttribute("data-motion-engine", "framer-motion");
    const controls = animate(
      elements,
      reduced
        ? { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }
        : {
            opacity: [0, 1],
            x: [direction * motionSettings.travel, 0],
            y: [workspace ? 12 : 0, 0],
            filter: ["blur(4px)", "blur(0px)"],
          },
      {
        ...motionSettings.enter,
        duration: reduced ? 0 : motionSettings.enter.duration,
        delay: reduced ? 0 : stagger(motionSettings.stagger),
      },
    );
    let current = true;
    void controls.then(() => {
      if (current) root.setAttribute("data-motion-state", "idle");
    });
    return () => {
      current = false;
      controls.stop();
      root.setAttribute("data-motion-state", "idle");
    };
  }, [trigger, workspace, reduced, scope, animate]);
  return scope;
}

export function useScrollReveal<T extends HTMLElement>() {
  const [scope, animate] = useAnimate<T>();
  const reduced = useMotionPreference();
  useEffect(() => {
    const root = scope.current;
    if (!root || !window.IntersectionObserver) return;
    const elements = root.querySelectorAll(".landing-section, .landing-closing");
    if (reduced) {
      void animate(elements, { opacity: 1, y: 0 }, { duration: 0 });
      return;
    }
    const controls: { stop: () => void }[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          controls.push(
            animate(
              entry.target,
              { opacity: [0, 1], y: [motionSettings.lift, 0] },
              motionSettings.enter,
            ),
          );
        }
      },
      { threshold: 0.12 },
    );
    for (const element of elements) observer.observe(element);
    return () => {
      observer.disconnect();
      for (const animation of controls) animation.stop();
    };
  }, [reduced, scope, animate]);
  return scope;
}
