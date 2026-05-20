"use client";

import type { ReactNode } from "react";

/*
 * Shared cube-face surface used by both InfoFrame and EcosystemFrame.
 *
 * Three variants, three materials:
 *   - matte   ▸ near-black face with a faint diagonal bevel and a
 *                rust 1px inset border. The "hero" material.
 *   - glass   ▸ translucent white-tinted face with a brighter bevel
 *                and a paper-soft 1px inset border. Reads ephemeral,
 *                used for small "supporting" cubes.
 *   - paper   ▸ inverted: paper background with ink content. Echoes
 *                the page tone, used for cubes that sit on a paper
 *                ground and want to feel "embossed" rather than
 *                "floating in front of the page".
 *
 * The face is intentionally not given a `border-radius` — the cube's
 * geometry has to feel like a SOLID, not a stack of pill cards.
 */

export type FaceVariant = "matte" | "glass" | "paper";

interface Props {
  children: ReactNode;
  className?: string;
  variant?: FaceVariant;
}

export function Panel3D({ children, className, variant = "matte" }: Props) {
  const style = SURFACE_STYLES[variant];
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
      style={{
        background: style.background,
        boxShadow: style.boxShadow,
        // Backdrop blur only kicks in on glass; cheap no-op otherwise.
        backdropFilter: style.backdropFilter,
        WebkitBackdropFilter: style.backdropFilter,
      }}
    >
      {/* Bevel pass — a faint diagonal gradient overlayed with `screen`
          (matte/glass) or `multiply` (paper) so light reads as coming
          from the upper-left. Sells the face as material, not paint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: style.bevel,
          mixBlendMode: style.bevelBlend,
          opacity: style.bevelOpacity,
        }}
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

interface SurfaceStyle {
  background: string;
  boxShadow: string;
  bevel: string;
  bevelBlend: "screen" | "multiply" | "overlay";
  bevelOpacity: number;
  backdropFilter: string;
}

const SURFACE_STYLES: Record<FaceVariant, SurfaceStyle> = {
  matte: {
    background: "#070707",
    // 1px white-alpha hairline edge — keeps face seams visible
    // mid-rotation without the orange accent.
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 0 0 2px rgba(255,255,255,0.04)",
    bevel:
      "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)",
    bevelBlend: "screen",
    bevelOpacity: 1,
    backdropFilter: "none",
  },
  glass: {
    // Slight white wash so the face reads as frosted glass over the
    // paper ground rather than a tinted square.
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
    boxShadow:
      "inset 0 0 0 1px rgba(10,10,10,0.85), inset 0 0 0 2px rgba(10,10,10,0.18)",
    bevel:
      "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 60%, rgba(0,0,0,0.10) 100%)",
    bevelBlend: "screen",
    bevelOpacity: 0.8,
    backdropFilter: "blur(8px) saturate(120%)",
  },
  paper: {
    background: "var(--paper)",
    boxShadow:
      "inset 0 0 0 1px rgba(10,10,10,0.85), inset 0 0 0 2px rgba(10,10,10,0.06)",
    bevel:
      "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.06) 100%)",
    bevelBlend: "multiply",
    bevelOpacity: 0.8,
    backdropFilter: "none",
  },
};
