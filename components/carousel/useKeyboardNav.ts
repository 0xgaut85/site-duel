"use client";

import { useEffect } from "react";
import { useCarousel } from "./CarouselContext";

/**
 * Wires Arrow / Home / End / PageUp / PageDown to frame navigation. Nested
 * scroll handlers (e.g. the InfoFrame sub-carousel) get first dibs and may
 * absorb the gesture before the parent advances.
 */
export function useKeyboardNav(): void {
  const { activeIndex, frameCount, goTo, nestedHandlersRef } = useCarousel();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }

      const nested = nestedHandlersRef.current.get(activeIndex);
      let dir: 1 | -1 | 0 = 0;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          dir = 1;
          break;
        case "ArrowLeft":
        case "PageUp":
          dir = -1;
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          return;
        case "End":
          e.preventDefault();
          goTo(frameCount - 1);
          return;
      }

      if (dir === 0) return;
      e.preventDefault();

      if (nested && nested.tryAdvance(dir)) return;
      goTo(activeIndex + dir);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, frameCount, goTo, nestedHandlersRef]);
}
