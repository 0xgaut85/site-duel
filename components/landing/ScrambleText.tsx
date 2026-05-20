"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/*
 * Time-based character scramble. Each character in `text` is, at any moment,
 * either:
 *   - already revealed (its true character), or
 *   - showing a random glyph from GLYPHS.
 *
 * Reveal progresses linearly from left to right over `duration` seconds.
 * The scramble is paint-only (a ghost copy of the text holds the layout),
 * so the surrounding flow never shifts.
 */

const GLYPHS = "!<>-_\\/[]{}=+*^?#%$&@01"; // glitchy ASCII palette (no em dash)

interface Props {
  text: string;
  /** Trigger when this prop flips true. Reverts to ghost on false. */
  active: boolean;
  /** Total scramble duration in seconds. Default 2.4. */
  duration?: number;
  /** Delay before scramble begins, in seconds. Default 0. */
  delay?: number;
  className?: string;
}

export function ScrambleText({
  text,
  active,
  duration = 2.4,
  delay = 0,
  className,
}: Props) {
  const paintRef = useRef<HTMLSpanElement>(null);
  const progress = useRef({ p: 0 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!paintRef.current) return;

    // Kill any in-flight tween.
    tweenRef.current?.kill();

    if (!active) {
      progress.current.p = 0;
      paintRef.current.textContent = "";
      return;
    }

    progress.current.p = 0;

    tweenRef.current = gsap.to(progress.current, {
      p: 1,
      duration,
      delay,
      ease: "none",
      onUpdate: () => {
        if (!paintRef.current) return;
        const p = progress.current.p;
        const n = text.length;
        const revealedUpto = Math.floor(p * n);
        let out = "";
        for (let i = 0; i < n; i++) {
          if (i < revealedUpto) {
            out += text[i];
          } else if (text[i] === " ") {
            out += " ";
          } else {
            // Stutter: randomize at ~25 Hz so the glitch is visible but
            // not seizure-inducing. Bias glyph pick toward symbols early,
            // letters later.
            out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
        }
        paintRef.current.textContent = out;
      },
      onComplete: () => {
        if (paintRef.current) paintRef.current.textContent = text;
      },
    });

    return () => {
      tweenRef.current?.kill();
    };
  }, [active, text, duration, delay]);

  return (
    <span className={className} style={{ position: "relative", display: "inline-block" }}>
      {/* Ghost holds the layout */}
      <span aria-hidden style={{ opacity: 0, whiteSpace: "nowrap" }}>{text}</span>
      {/* Paint layer */}
      <span
        ref={paintRef}
        aria-label={text}
        style={{
          position: "absolute",
          inset: 0,
          whiteSpace: "nowrap",
        }}
      />
    </span>
  );
}
