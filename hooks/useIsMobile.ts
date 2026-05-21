"use client";

import { useSyncExternalStore } from "react";

/** Matches globals.css carousel fallback breakpoint (max-width: 767px). */
export const MOBILE_MAX_WIDTH_PX = 767;

function subscribeMobile(maxWidth: number, onChange: () => void) {
  const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMobileSnapshot(maxWidth: number) {
  const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
  const vw = window.visualViewport?.width ?? window.innerWidth;
  return mq.matches || vw <= maxWidth;
}

/**
 * Viewport width ≤767px. On the client, reads matchMedia during render (no
 * one-frame desktop flash). SSR returns false; mobile layout still works
 * via CSS `@media (max-width: 767px)` before hydration.
 */
export function useIsMobile(
  maxWidth = MOBILE_MAX_WIDTH_PX,
): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMobile(maxWidth, onChange),
    () => getMobileSnapshot(maxWidth),
    () => false,
  );
}
