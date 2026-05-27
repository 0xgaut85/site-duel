/**
 * Dashboard chrome — auth gate + topbar shell + main scrollable area.
 *
 * Every page under `/dashboard/*` flows through this layout. Pages
 * themselves are simple server components; this layout enforces the
 * one universal precondition (you must be signed in) and renders the
 * persistent app furniture (logo, nav links, profile menu).
 */

import Link from "next/link";
import { requireSession, isAdminEmail } from "@/lib/session";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isAdmin = isAdminEmail(session.user.email);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Topbar email={session.user.email} isAdmin={isAdmin} />
      <main className="flex-1 px-6 md:px-10 lg:px-16 py-10 max-w-[1240px] w-full mx-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Topbar({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  return (
    <header className="border-b border-ink/10">
      <div className="max-w-[1240px] w-full mx-auto px-6 md:px-10 lg:px-16 h-16 flex items-center justify-between gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group"
          aria-label="Duel Agents dashboard home"
        >
          <span
            className="font-display font-medium text-ink"
            style={{
              fontSize: "1.15rem",
              letterSpacing: "-0.02em",
            }}
          >
            Duel Agents
          </span>
          <span
            className="font-mono text-ink-faint"
            style={{ fontSize: "10px", letterSpacing: "0.28em" }}
          >
            / DASHBOARD
          </span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-8 font-mono"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          <Link
            href="/dashboard"
            className="text-ink hover:opacity-70 transition-opacity"
          >
            OVERVIEW
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-ink hover:opacity-70 transition-opacity"
          >
            SETTINGS
          </Link>
          <Link
            href="/dashboard/billing"
            className="text-ink hover:opacity-70 transition-opacity"
          >
            BILLING
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-rust hover:opacity-70 transition-opacity"
            >
              ADMIN
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-5">
          <span
            className="hidden sm:inline font-mono text-ink-faint"
            style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
          >
            {email.toUpperCase()}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="border-t border-ink/10 px-6 md:px-10 lg:px-16 py-5 font-mono text-ink-faint flex items-center justify-between max-w-[1240px] w-full mx-auto"
      style={{ fontSize: "10px", letterSpacing: "0.28em" }}
    >
      <span>© DUEL AGENTS 2026</span>
      <Link href="/" className="hover:text-ink transition-colors">
        ← BACK TO SITE
      </Link>
    </footer>
  );
}
