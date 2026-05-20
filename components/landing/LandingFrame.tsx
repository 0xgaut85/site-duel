"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useCarousel } from "@/components/carousel/CarouselContext";
import { ScrambleText } from "./ScrambleText";
import type { LogoHandle } from "./Logo3D";

const Logo3D = dynamic(() => import("./Logo3D").then((m) => m.Logo3D), {
  ssr: false,
});

/*
 * Landing frame — a giant 3D logo that splits like double doors on
 * hover, revealing the "Duel Agents" wordmark between the halves.
 * Idle: silhouette is stationary, but the surface texture inside the
 * glass flows continuously and the orbit lights sweep specular
 * highlights across it.
 */
export function LandingFrame() {
  const { goTo } = useCarousel();
  const controlsRef = useRef<LogoHandle | null>(null);
  const [open, setOpen] = useState(false);

  const handleEnter = useCallback(() => {
    setOpen(true);
    controlsRef.current?.open();
  }, []);

  const handleLeave = useCallback(() => {
    setOpen(false);
    controlsRef.current?.close();
  }, []);

  return (
    <div
      className="relative h-full w-full text-ink overflow-hidden"
      style={{ padding: "var(--frame-padding)", background: "var(--paper)" }}
    >
      {/* Logo canvas — oversized & absolutely positioned at the viewport
          center. Width/height are 150% of the viewport so when the doors
          slide outward they have ~25% of viewport-width of slack on each
          side before they hit the canvas edge. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 z-0 pointer-events-none"
        style={{
          width: "150vw",
          height: "150vh",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Logo3D controlsRef={controlsRef} />
      </div>

      {/* Wordmark + subtitle — anchored to the visible viewport center as
          a single stacked block. Sits between the two halves when they
          open. */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 pointer-events-none">
        <AnimatePresence>
          {open && (
            <motion.h1
              key="wordmark"
              initial={{ opacity: 0, scale: 0.96, letterSpacing: "-0.04em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "-0.02em" }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1] }}
              className="font-display font-medium leading-[1] text-ink select-none"
              style={{
                fontSize: "clamp(3rem, 9vw, 9rem)",
                whiteSpace: "nowrap",
              }}
            >
              Duel Agents
            </motion.h1>
          )}
        </AnimatePresence>

        <ScrambleText
          text="agents that compete, so your wallet doesn't"
          active={open}
          duration={2.6}
          delay={0.15}
          className="font-mono text-[clamp(11px,1.2vw,15px)] tracking-[0.22em] text-ink-faint uppercase"
        />
      </div>

      {/* Hover hit area — a transparent rectangle at the visible center
          the size of the resting logo. Triggers the door-open. Sits
          above the canvas but below the wordmark visually (wordmark uses
          pointer-events-none so this still receives the events). */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onFocus={handleEnter}
          onBlur={handleLeave}
          tabIndex={0}
          role="button"
          aria-label="Duel Agents, hover to reveal"
          className="pointer-events-auto outline-none"
          style={{
            width: "min(70vh, 70vw)",
            height: "min(60vh, 60vw)",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Scroll hint — bottom-center, alone. */}
      <div className="absolute left-0 right-0 bottom-[calc(var(--frame-padding)*2)] z-30 flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={() => goTo(1)}
          className="font-mono text-[10px] tracking-[0.3em] text-ink-faint hover:text-ink transition-colors flex flex-col items-center gap-2 group"
          aria-label="Scroll to learn more"
        >
          <span>SCROLL</span>
          <span
            aria-hidden="true"
            className="block h-6 w-px bg-ink-faint group-hover:bg-ink transition-colors"
          />
        </button>
      </div>
    </div>
  );
}
