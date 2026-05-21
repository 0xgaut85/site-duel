"use client";

import { useEffect, useState } from "react";
import { MOBILE_MAX_WIDTH_PX, useIsMobile } from "./useIsMobile";

/**
 * True when scroll-driven / horizontal carousel motion should be disabled:
 * `prefers-reduced-motion: reduce` or mobile viewport (vertical stack).
 */
export function useReducedMotion(): boolean {
  const mobile = useIsMobile();
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const motionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(motionMQ.matches);
    update();
    motionMQ.addEventListener("change", update);
    return () => motionMQ.removeEventListener("change", update);
  }, []);

  return prefersReduced || mobile;
}

export { MOBILE_MAX_WIDTH_PX };
