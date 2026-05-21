"use client";

import { useCarousel } from "@/components/carousel/CarouselContext";

/*
 * Fixed chrome visible on every carousel frame — top-right social link.
 * Sits above the slide content (z-60) but below the page transition (z-200).
 * Hidden on 04-access; that frame stacks the link under BACK TO START.
 */

export const X_TWITTER_URL = "https://x.com/duelagentscom";

export function SiteChrome() {
  const { frames, activeIndex } = useCarousel();
  const onAccessFrame = frames[activeIndex]?.id === "04-access";

  if (onAccessFrame) return null;

  return (
    <a
      data-site-chrome=""
      href={X_TWITTER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-[60] pointer-events-auto font-mono text-[10px] tracking-[0.28em] transition-opacity hover:opacity-70 max-md:mix-blend-normal max-md:text-ink"
      style={{
        top: "var(--frame-padding)",
        right: "var(--frame-padding)",
        mixBlendMode: "difference",
        color: "rgba(220,220,220,0.92)",
      }}
    >
      X / TWITTER
    </a>
  );
}
