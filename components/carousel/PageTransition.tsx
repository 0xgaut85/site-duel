"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/*
 * Full-screen page transition overlay.
 *
 * Centered on a pitch-black field with heavy animated grain:
 *
 *     DUEL  AGENTS
 *       [logo]      ← continuously rotates like a loading spinner
 *
 * The wordmark sits in real DOM (real font, real subpixel rendering); the
 * logo is the same /logo.png, white, looping a 360° rotation throughout
 * the overlay's lifetime.
 *
 * Wrapper opacity uses a trapezoid keyframe envelope so the overlay is
 * invisible at mount/unmount — no AnimatePresence exit tween, no flash.
 */

interface Props {
  /** Numeric ticket; any change kicks off a single play. */
  trigger: number;
  /** Total duration of the transition in ms. Default 3000. */
  duration?: number;
}

const LOGO_SRC = "/logo.png";

// Wrapper opacity envelope (trapezoid).
const FADE_IN_END = 0.1;
const FADE_OUT_START = 0.9;

// Content visibility envelope (fades up after wrapper, fades down before).
const CONTENT_IN_START = 0.12;
const CONTENT_IN_END = 0.22;
const CONTENT_OUT_START = 0.82;
const CONTENT_OUT_END = 0.9;

// Rotation period of the spinner, in seconds. Independent of total
// transition duration so the speed feels consistent regardless of how
// long the overlay is on screen.
const SPIN_PERIOD_S = 1.6;

export function PageTransition({ trigger, duration = 3000 }: Props) {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    setKey((k) => k + 1);
    setPlaying(true);
    const t = setTimeout(() => setPlaying(false), duration);
    return () => clearTimeout(t);
  }, [trigger, duration]);

  if (!playing) return null;

  return (
    <motion.div
      key={key}
      className="pointer-events-none fixed inset-0 z-[200]"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        duration: duration / 1000,
        ease: "linear",
        times: [0, FADE_IN_END, FADE_OUT_START, 1],
      }}
      style={{ background: "var(--paper)" }}
    >
      <Content duration={duration} />
      <GrainLayer />
    </motion.div>
  );
}

/* --------------------------------------------------------- Content */

function Content({ duration }: { duration: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Single rAF loop drives both the content opacity envelope AND the
  // spinner rotation. Time-based, so it's framerate-independent.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const spinner = wrap.querySelector<HTMLDivElement>("[data-spinner]");

    const start = performance.now();
    let rafId = 0;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);

      // Opacity envelope.
      let alpha = 0;
      if (t < CONTENT_IN_START) alpha = 0;
      else if (t < CONTENT_IN_END)
        alpha = (t - CONTENT_IN_START) / (CONTENT_IN_END - CONTENT_IN_START);
      else if (t < CONTENT_OUT_START) alpha = 1;
      else if (t < CONTENT_OUT_END)
        alpha =
          1 -
          (t - CONTENT_OUT_START) / (CONTENT_OUT_END - CONTENT_OUT_START);
      else alpha = 0;
      wrap.style.opacity = alpha.toFixed(3);

      // Rotation (continuous, wraps at 360°).
      if (spinner) {
        const deg = ((elapsed / 1000) * 360) / SPIN_PERIOD_S;
        spinner.style.transform = `rotate(${deg.toFixed(2)}deg)`;
      }

      if (t < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [duration]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ opacity: 0, willChange: "opacity", gap: "clamp(28px, 5vmin, 56px)" }}
    >
      <span
        className="font-display font-medium text-ink select-none"
        style={{
          fontSize: "clamp(28px, 5vmin, 64px)",
          letterSpacing: "0.16em",
          lineHeight: 1,
        }}
      >
        DUEL&nbsp;&nbsp;AGENTS
      </span>

      {/* Plain <img> with the white-tint filter — no positioning wrapper,
          no background, no border, no shadow. Just the alpha-masked logo
          shape rotating in place. */}
      <img
        data-spinner
        src={LOGO_SRC}
        alt=""
        style={{
          width: "clamp(48px, 7vmin, 88px)",
          height: "clamp(48px, 7vmin, 88px)",
          objectFit: "contain",
          filter: "brightness(0)",
          willChange: "transform",
          display: "block",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------- Grain layer */

function GrainLayer() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ mixBlendMode: "multiply", opacity: 0.18 }}
    >
      <filter id="page-transition-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.95"
          numOctaves="2"
          stitchTiles="stitch"
        >
          <animate
            attributeName="seed"
            values="1;9;2;7;5;1"
            dur="0.6s"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="1.1" />
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter="url(#page-transition-grain)" />
    </svg>
  );
}
