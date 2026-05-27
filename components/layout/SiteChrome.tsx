"use client";

import { useCarousel } from "@/components/carousel/CarouselContext";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { X_TWITTER_URL } from "@/lib/site-links";

/*
 * Fixed chrome on frames 1–3: Duel App + X link.
 * Frame 4 has its own rail (Duel App, X, back to start).
 */
export function SiteChrome() {
  const { frames, activeIndex } = useCarousel();
  const frameId = frames[activeIndex]?.id;
  const onAccessFrame = frameId === "04-access";

  if (onAccessFrame) return null;

  const darkBg = frameId === "02-info";

  return (
    <div
      className="fixed z-[60] pointer-events-auto flex w-[min(100%,11.5rem)] flex-col items-stretch gap-3 max-md:mix-blend-normal"
      style={{
        top: "var(--frame-padding)",
        right: "var(--frame-padding)",
      }}
    >
      <LiquidButton href="/dashboard" darkBg={darkBg}>
        DUEL APP
      </LiquidButton>
      <a
        data-site-chrome=""
        href={X_TWITTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] tracking-[0.28em] transition-opacity hover:opacity-70 text-right max-md:text-ink"
        style={{
          mixBlendMode: "difference",
          color: "rgba(220,220,220,0.92)",
        }}
      >
        X / TWITTER
      </a>
    </div>
  );
}
