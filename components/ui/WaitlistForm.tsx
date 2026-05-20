"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

/*
 * Waitlist form for the 04 · ACCESS frame.
 *
 * Layout
 * ──────
 *  - Email field on its own row, drawn as a single thick hairline at
 *    the bottom (no boxed input — feels editorial, not "form-like").
 *  - REQUEST ACCESS rendered as a liquid-glass CAPSULE on its own
 *    row below, full-width on dark grounds. The capsule layers a
 *    translucent paper gradient, an inset light hairline, a faint
 *    inner highlight, and a soft drop shadow — all CSS, no images.
 *  - Footer note + (optional) error line below.
 *
 * No green / rust accents anywhere. Everything is paper/ink + alpha.
 */
export function WaitlistForm({ darkBg }: { darkBg?: boolean } = {}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "REQUEST_FAILED");
      }
      setStatus("success");
      setMessage(data.message ?? "You're on the list. Watch the inbox.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const strong = darkBg ? "text-paper" : "text-ink";
  const soft = darkBg ? "text-paper-faint" : "text-ink-soft";
  const fade = darkBg ? "text-paper-faint" : "text-ink-faint";
  const placeholder = darkBg
    ? "placeholder:text-paper-faint"
    : "placeholder:text-ink-faint";
  const divider = darkBg ? "border-paper/25" : "border-ink/20";

  /* ─────────────────────────────────────────── SUCCESS state */
  if (status === "success") {
    return (
      <div className="font-mono text-[14px] tracking-[0.14em] space-y-4">
        <div className={`flex items-center gap-3 ${strong}`}>
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full"
            style={{ background: darkBg ? "var(--paper)" : "var(--ink)" }}
          />
          REQUEST_ACCEPTED
        </div>
        <p
          className={`normal-case tracking-normal max-w-[28ch] text-[15px] leading-[1.5] ${soft}`}
        >
          {message}
        </p>
      </div>
    );
  }

  /* ─────────────────────────────────────────── IDLE state */
  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-6" noValidate>
      <label htmlFor="wl-email" className="sr-only">
        Email address
      </label>

      {/* Email row — minimal, editorial. Just a thick bottom hairline. */}
      <div className={`border-b ${divider} pb-3`}>
        <input
          id="wl-email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={`bg-transparent font-body text-[18px] focus:outline-none w-full py-3 ${strong} ${placeholder}`}
          autoComplete="email"
          inputMode="email"
          spellCheck="false"
        />
      </div>

      {/* Liquid-glass CTA */}
      <LiquidButton
        loading={status === "loading"}
        disabled={status === "loading"}
        darkBg={darkBg}
      >
        {status === "loading" ? "SENDING…" : "REQUEST ACCESS"}
      </LiquidButton>

      {status === "error" && (
        <p className={`font-mono text-[12px] tracking-[0.14em] ${strong}`}>
          ERR · {message}
        </p>
      )}
      <p className={`font-mono text-[10px] tracking-[0.18em] ${fade}`}>
        · NO MARKETING · ONE EMAIL WHEN ACCESS OPENS ·
      </p>
    </form>
  );
}

/* ───────────────────────────────────────── Liquid-glass button */

interface LiquidButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  darkBg?: boolean;
}

/**
 * A pill-shaped CTA rendered with CSS-only "liquid glass" treatment:
 *   - translucent layered background (paper or ink alpha)
 *   - backdrop blur + saturate so the photograph behind is visible
 *     through the button, refracted
 *   - inset light hairline + faint highlight gradient sells the glass
 *   - soft outer shadow gives lift off the page
 *   - hover scales the button + shifts the arrow + brightens the
 *     inner highlight; transitions are eased with the project ease
 */
function LiquidButton({
  children,
  loading,
  disabled,
  darkBg,
}: LiquidButtonProps) {
  // Two presets — one for sitting on dark imagery (paper-tinted glass)
  // and one for sitting on white paper (ink-tinted glass).
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

  return (
    <button
      type="submit"
      disabled={disabled}
      className="group relative w-full overflow-hidden font-mono tracking-[0.24em] disabled:opacity-50 transition-[transform,box-shadow] duration-300"
      style={{
        // pill — large radius so the shape reads as a capsule not a card
        borderRadius: 9999,
        padding: "clamp(0.95rem, 1.6vw, 1.2rem) clamp(1.3rem, 2.4vw, 2rem)",
        fontSize: "clamp(11.5px, 1vw, 13.5px)",
        color: surface.color,
        background: surface.background,
        boxShadow: `${surface.innerRing}, ${surface.outerShadow}`,
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
      }}
    >
      {/* Top-light highlight pass — sells the curvature of the glass.
          Sits ABOVE the background but BELOW the label, with `screen`
          blend on dark / `overlay` on light. */}
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
      {/* Subtle moving sheen on hover — a faint angled gradient that
          slides across the pill. Pure CSS, GPU-cheap. */}
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

      <span className="relative z-10 flex items-center justify-between gap-3 w-full">
        <span>{children}</span>
        <span
          aria-hidden
          className={`inline-block transition-transform duration-300 ${
            loading ? "" : "group-hover:translate-x-1.5"
          }`}
        >
          →
        </span>
      </span>
    </button>
  );
}
