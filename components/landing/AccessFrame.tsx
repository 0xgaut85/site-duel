"use client";

import { useCarousel } from "@/components/carousel/CarouselContext";
import { WaitlistForm } from "@/components/ui/WaitlistForm";

/*
 * 04 · ACCESS — full-bleed dark photograph behind an ink scrim. The
 * frame is laid out as a magazine spread:
 *
 *   ┌─ 04 · REQUEST ACCESS ─────────────── ← BACK TO START ─┐
 *   │                                                       │
 *   │   Get in early.                                       │
 *   │   (paragraph)                                         │
 *   │                                                       │
 *   │   [ email field         ]                             │
 *   │   [  REQUEST ACCESS  →  ]   ← liquid-glass pill       │
 *   │   · NO MARKETING · ONE EMAIL WHEN ACCESS OPENS ·       │
 *   │                                                       │
 *   └───────────────────────────────────────────────────────┘
 *
 * Eyebrow + back-link are pinned to the top corners; the content
 * column sits left-anchored and vertically centred between them. No
 * green / rust accents anywhere on this frame.
 */
export function AccessFrame() {
  const { goTo } = useCarousel();

  return (
    <div className="relative h-full w-full overflow-hidden text-paper">
      {/* Background image — full bleed, behind the scrim. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url(/image5.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Ink scrim — knocks the photograph back so the type reads,
          without losing the underlying texture. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--ink)", opacity: 0.55 }}
      />

      {/* Top rail — eyebrow (left) and back-link (right). Pinned. */}
      <div
        className="absolute left-0 right-0 z-10 flex items-center justify-between"
        style={{
          top: "var(--frame-padding)",
          paddingLeft: "var(--frame-padding)",
          paddingRight: "var(--frame-padding)",
        }}
      >
        <span className="font-mono text-[10px] tracking-[0.3em] text-paper-faint">
          04 · REQUEST ACCESS
        </span>
        <button
          type="button"
          onClick={() => goTo(0)}
          className="font-mono text-[10px] tracking-[0.3em] text-paper-faint hover:text-paper transition-colors"
        >
          ← BACK TO START
        </button>
      </div>

      {/* Content column — left-anchored, vertically centred. */}
      <div className="relative z-10 h-full w-full flex items-center">
        <div
          className="w-full flex flex-col gap-8 max-w-[42rem]"
          style={{
            paddingLeft: "var(--frame-padding)",
            paddingRight: "1.5rem",
          }}
        >
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-[clamp(2.6rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-[-0.025em] text-paper">
              Get in early.
            </h2>
            <p className="text-paper-faint text-[clamp(15px,1.15vw,17px)] leading-[1.55] max-w-[38ch]">
              We&apos;re onboarding a small first wave. Drop your email; we
              send one message when access opens.
            </p>
          </div>

          <div className="max-w-[28rem]">
            <WaitlistForm darkBg />
          </div>
        </div>
      </div>

    </div>
  );
}
