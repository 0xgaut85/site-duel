"use client";

import { useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useCarousel } from "./CarouselContext";

/**
 * Horizontal swipe → frame nav. Nested scroll handlers (sub-carousels) get
 * first chance to absorb the swipe before the parent advances frames.
 */
export function useTouchSwipe(threshold = 60): void {
  const { activeIndex, goTo, nestedHandlersRef } = useCarousel();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;

    let startX = 0;
    let startY = 0;
    let started = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      started = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!started) return;
      started = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      const dir: 1 | -1 = dx < 0 ? 1 : -1;
      const nested = nestedHandlersRef.current.get(activeIndex);
      if (nested && nested.tryAdvance(dir)) return;
      goTo(activeIndex + dir);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [activeIndex, goTo, threshold, nestedHandlersRef, isMobile]);
}
