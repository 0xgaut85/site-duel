"use client";

import { useEffect, useState } from "react";

/**
 * Reactive matchMedia hook for `prefers-reduced-motion: reduce`.
 * SSR-safe: defaults to `false` on the server so the smooth experience
 * mounts first, then re-evaluates on the client.
 *
 * Also returns true on small viewports (<768px) where the horizontal
 * carousel falls back to a vertical stack and no scroll-driven animation
 * is appropriate.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const motionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMQ = window.matchMedia("(max-width: 767px)");
    const update = () => setReduced(motionMQ.matches || mobileMQ.matches);
    update();
    motionMQ.addEventListener("change", update);
    mobileMQ.addEventListener("change", update);
    return () => {
      motionMQ.removeEventListener("change", update);
      mobileMQ.removeEventListener("change", update);
    };
  }, []);

  return reduced;
}
