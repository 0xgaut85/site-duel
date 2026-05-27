"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export interface LiquidButtonProps {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  darkBg?: boolean;
  href?: string;
  type?: "button" | "submit";
  className?: string;
  onClick?: () => void;
}

/**
 * Pill-shaped liquid-glass CTA — shared by waitlist, page-4 Duel App, etc.
 */
export function LiquidButton({
  children,
  loading,
  disabled,
  darkBg,
  href,
  type = "submit",
  className = "",
  onClick,
}: LiquidButtonProps) {
  const surface = darkBg
    ? {
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.10))",
        innerRing:
          "inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 1px 0 0 rgba(255,255,255,0.55)",
        outerShadow:
          "0 14px 40px -16px rgba(0,0,0,0.55), 0 2px 6px -2px rgba(0,0,0,0.4)",
        highlight:
          "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)",
        color: "var(--paper)",
      }
    : {
        background:
          "linear-gradient(135deg, rgba(10,10,10,0.08), rgba(10,10,10,0.02) 60%, rgba(10,10,10,0.06))",
        innerRing:
          "inset 0 0 0 1px rgba(10,10,10,0.18), inset 0 1px 0 0 rgba(255,255,255,0.55)",
        outerShadow:
          "0 14px 40px -18px rgba(10,10,10,0.35), 0 2px 6px -2px rgba(10,10,10,0.18)",
        highlight:
          "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%)",
        color: "var(--ink)",
      };

  const inner = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: surface.highlight,
          mixBlendMode: darkBg ? "screen" : "overlay",
          opacity: 0.85,
          transition: "opacity 300ms ease",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: darkBg
            ? "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)"
            : "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
          transform: "translateX(-25%)",
        }}
      />
      <span className="relative z-10 w-full text-center">{children}</span>
    </>
  );

  const style = {
    borderRadius: 9999,
    padding: "clamp(0.95rem, 1.6vw, 1.2rem) clamp(1.3rem, 2.4vw, 2rem)",
    fontSize: "clamp(11.5px, 1vw, 13.5px)",
    color: surface.color,
    background: surface.background,
    boxShadow: `${surface.innerRing}, ${surface.outerShadow}`,
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
  } as const;

  const cls = `group relative w-full overflow-hidden font-mono tracking-[0.24em] disabled:opacity-50 transition-[transform,box-shadow] duration-300 ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${cls} block text-center no-underline`} style={style}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cls}
      style={style}
    >
      {inner}
    </button>
  );
}
