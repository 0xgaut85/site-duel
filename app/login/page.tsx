/**
 * Sign-in screen. Single email input → request magic link → "check your
 * inbox" confirmation. No password, no signup tab, no social buttons.
 *
 * Sign-in screen. Email → magic link. New emails are provisioned on first
 * request (public signup); the confirmation UI stays generic.
 */

import type { Metadata } from "next";
import { DashboardLogo } from "@/components/dashboard/DashboardLogo";
import { SiteTopActions } from "@/components/layout/SiteTopActions";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in · Duel Agents",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main
      className="relative min-h-screen flex items-center justify-center bg-paper text-ink px-6 py-12"
      style={{ paddingLeft: "var(--frame-padding, 1.5rem)" }}
    >
      <div
        className="fixed z-50 pointer-events-auto"
        style={{
          top: "var(--frame-padding, 1.5rem)",
          right: "var(--frame-padding, 1.5rem)",
        }}
      >
        <SiteTopActions variant="light" showDuelApp={false} />
      </div>
      <div className="w-full max-w-[28rem]">
        <div className="mb-10">
          <DashboardLogo href="/" />
        </div>
        <p
          className="font-mono text-ink-faint mb-8"
          style={{ fontSize: "11.5px", letterSpacing: "0.28em" }}
        >
          / SIGN IN
        </p>
        <h1
          className="font-display font-medium text-ink mb-2"
          style={{
            fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          Sign in.
        </h1>
        <p
          className="text-ink-soft mb-10 max-w-[34ch]"
          style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.05rem)", lineHeight: 1.55 }}
        >
          Enter your email for a one-time sign-in link. New accounts are
          created automatically. Paid plans and checkout open at public launch.
        </p>

        <LoginForm />

        <p
          className="font-mono text-ink-faint mt-12"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          / BACK TO SITE &nbsp;
          <a
            href="/"
            className="text-ink hover:opacity-70 transition-opacity"
          >
            DUEL AGENTS
          </a>
        </p>
      </div>
    </main>
  );
}
