"use client";

import { useCarousel } from "@/components/carousel/CarouselContext";
import { SiteTopActions } from "@/components/layout/SiteTopActions";

/*
 * Fixed chrome on frames 1–3: GitHub + X + compact Duel App.
 * Frame 4 has its own rail (AccessFrame).
 */
export function SiteChrome() {
  const { frames, activeIndex } = useCarousel();
  const frameId = frames[activeIndex]?.id;
  const onAccessFrame = frameId === "04-access";

  if (onAccessFrame) return null;

  const darkBg = frameId === "02-info";

  return (
    <div
      className="fixed z-[60] pointer-events-auto max-md:mix-blend-normal"
      style={{
        top: "var(--frame-padding)",
        right: "var(--frame-padding)",
      }}
    >
      <SiteTopActions
        variant={darkBg ? "dark" : "difference"}
        className="max-md:[&_a]:text-ink max-md:[&]:mix-blend-normal"
      />
    </div>
  );
}
