"use client";

import { useCarousel } from "@/components/carousel/CarouselContext";
import { useIsMobile } from "@/hooks/useIsMobile";

/**
 * Bottom frame picker on phones — jump between all four full-page sections
 * without horizontal swipe (carousel is a vertical stack on mobile).
 */
export function MobileFrameNav() {
  const isMobile = useIsMobile();
  const { frames, activeIndex, goTo } = useCarousel();

  if (!isMobile) return null;

  return (
    <nav
      data-mobile-frame-nav=""
      aria-label="Page sections"
      className="fixed bottom-0 left-0 right-0 z-[55] pointer-events-auto border-t border-ink/10 bg-paper/95 backdrop-blur-md md:hidden"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        paddingTop: "0.5rem",
        paddingLeft: "var(--frame-padding)",
        paddingRight: "var(--frame-padding)",
      }}
    >
      <ul className="m-0 flex list-none items-center justify-between gap-1 p-0">
        {frames.map((frame, i) => {
          const active = i === activeIndex;
          return (
            <li key={frame.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={active ? "true" : undefined}
                className={`w-full font-mono text-[9px] tracking-[0.18em] py-2 transition-colors ${
                  active
                    ? "text-ink"
                    : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
