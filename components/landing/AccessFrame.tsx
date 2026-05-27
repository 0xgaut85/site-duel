"use client";

import { useCarousel } from "@/components/carousel/CarouselContext";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { GITHUB_URL, X_TWITTER_URL } from "@/lib/site-links";

/*
 * 04 · USE DUEL AGENTS — live product entry frame.
 *
 *   ┌─ 04 · USE DUEL AGENTS ─────── BACK TO START ─┐
 *   │                              X / TWITTER     │
 *   │                              GITHUB          │
 *   │                              [ DUEL APP ]    │
 *   │   Use Duel Agents.                           │
 *   │   Sign in, manage keys, subscribe in billing.│
 *   └──────────────────────────────────────────────┘
 */
export function AccessFrame() {
  const { goTo, frames } = useCarousel();
  const startIndex = frames.findIndex((f) => f.id === "01-landing");

  return (
    <div
      data-access-frame=""
      className="relative h-full w-full min-h-[100dvh] overflow-hidden text-paper max-md:overflow-visible"
    >
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
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--ink)", opacity: 0.55 }}
      />

      <div
        data-access-rail=""
        className="absolute left-0 right-0 z-20 flex items-start justify-between"
        style={{
          top: "var(--frame-padding)",
          paddingLeft: "var(--frame-padding)",
          paddingRight: "var(--frame-padding)",
        }}
      >
        <span className="font-mono text-[10px] tracking-[0.3em] text-paper-faint">
          04 · USE DUEL AGENTS
        </span>
        <div className="relative flex w-[min(100%,11.5rem)] flex-col items-stretch gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              if (startIndex >= 0) goTo(startIndex, { force: true });
            }}
            className="font-mono text-[10px] tracking-[0.3em] text-paper-faint hover:text-paper transition-colors cursor-pointer text-right"
          >
            BACK TO START
          </button>
          <a
            href={X_TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-[0.28em] text-paper-faint hover:text-paper transition-colors text-right"
          >
            X / TWITTER
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-[0.28em] text-paper-faint hover:text-paper transition-colors text-right"
          >
            GITHUB
          </a>
          <LiquidButton href="/dashboard" darkBg>
            DUEL APP
          </LiquidButton>
        </div>
      </div>

      <div
        data-access-content=""
        className="relative z-10 h-full w-full flex items-center max-md:items-start max-md:py-[calc(var(--frame-padding)*2+8rem)] pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full flex flex-col gap-8 max-w-[42rem]"
          style={{
            paddingLeft: "var(--frame-padding)",
            paddingRight: "var(--frame-padding)",
          }}
        >
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-[clamp(2.6rem,5.5vw,4.5rem)] font-medium leading-[0.98] tracking-[-0.025em] text-paper">
              Use Duel Agents.
            </h2>
            <p className="text-paper-faint text-[clamp(15px,1.15vw,17px)] leading-[1.55] max-w-[38ch]">
            Sign in with a magic link, pick indie, pro, or team on billing,
            and generate API keys in settings. Card and USDC when stablecoin
            is enabled in Stripe.
            </p>
          </div>

          <div className="max-w-[20rem] md:hidden">
            <LiquidButton href="/dashboard" darkBg>
              DUEL APP
            </LiquidButton>
          </div>
        </div>
      </div>
    </div>
  );
}
