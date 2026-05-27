/**
 * Sign-in screen. Single email input → request magic link → "check your
 * inbox" confirmation. No password, no signup tab, no social buttons.
 *
 * Sign-in screen. Email → magic link. New emails are provisioned on first
 * request (public signup); the confirmation UI stays generic.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { isProductLive } from "@/lib/release";

export const metadata: Metadata = {
  title: "Sign in · Duel Agents",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Gated by the release flag — invisible until the product launches.
  if (!isProductLive()) {
    notFound();
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-paper text-ink px-6 py-12"
      style={{ paddingLeft: "var(--frame-padding, 1.5rem)" }}
    >
      <div className="w-full max-w-[28rem]">
        <p
          className="font-mono text-ink-faint mb-12"
          style={{ fontSize: "11.5px", letterSpacing: "0.28em" }}
        >
          / DUEL AGENTS · SIGN IN
        </p>
        <h1
          className="font-display font-medium text-ink mb-2"
          style={{
            fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          Welcome back.
        </h1>
        <p
          className="text-ink-soft mb-10 max-w-[30ch]"
          style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.05rem)", lineHeight: 1.55 }}
        >
          Enter your email. We'll send a one-time sign-in link — new accounts
          are created automatically.
        </p>

        <LoginForm />

        <p
          className="font-mono text-ink-faint mt-12"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          / NEW HERE? &nbsp;
          <a
            href="/#04-access"
            className="text-ink hover:opacity-70 transition-opacity"
          >
            USE DUEL AGENTS →
          </a>
        </p>
      </div>
    </main>
  );
}
