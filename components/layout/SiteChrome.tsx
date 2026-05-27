"use client";

import Link from "next/link";
import { useCarousel } from "@/components/carousel/CarouselContext";
import { X_TWITTER_URL } from "@/lib/site-links";

/*
 * Fixed chrome on frames 1–3: Sign in + X link.
 * Frame 4 has its own rail (Duel App, X, GitHub).
 */
export function SiteChrome() {
  const { frames, activeIndex } = useCarousel();
  const onAccessFrame = frames[activeIndex]?.id === "04-access";

  if (onAccessFrame) return null;

  return (
    <div
      className="fixed z-[60] pointer-events-auto flex flex-col items-end gap-3 max-md:mix-blend-normal"
      style={{
        top: "var(--frame-padding)",
        right: "var(--frame-padding)",
      }}
    >
      <Link
        href="/dashboard"
        data-site-chrome=""
        className="font-mono text-[10px] tracking-[0.28em] transition-opacity hover:opacity-70"
        style={{
          mixBlendMode: "difference",
          color: "rgba(220,220,220,0.92)",
        }}
      >
        SIGN IN
      </Link>
      <a
        data-site-chrome=""
        href={X_TWITTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] tracking-[0.28em] transition-opacity hover:opacity-70 max-md:text-ink"
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
