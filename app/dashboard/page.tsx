/**
 * /dashboard — overview / empty state for the invite-only beta.
 *
 * Phase 1 ships the shell only. Phase 4 fills this page with the live
 * savings counter, recent calls table, model distribution donut, and
 * usage meter; this empty state is the placeholder until then.
 *
 * What ships now:
 *   - Welcome banner (special-cased for the post-invite first-load case
 *     via the `?welcome=1` query param).
 *   - Three placeholder stat cards so the page isn't bare during the
 *     period before any /v1 calls have happened.
 *   - A clear "next step" pointing at the install CLI snippets on the
 *     settings page.
 */

import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { ensureUserProvisioned } from "@/lib/provision";
import { db, schema } from "@/db/client";

interface PageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = await searchParams;
  const isFirstVisit = params.welcome === "1";

  /* Look up the user's primary account so we can render quota etc.
   * The user always has at least one account (the owner row created
   * at invite time). */
  let [account] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  if (!account && session.user.email) {
    await ensureUserProvisioned(session.user.id, session.user.email);
    [account] = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.ownerId, session.user.id))
      .limit(1);
  }

  const [subscription] = account
    ? await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.accountId, account.id))
        .limit(1)
    : [];

  const quota = subscription?.monthlyCallQuota ?? 0;
  const used = subscription?.callsUsedThisPeriod ?? 0;
  const tier = subscription?.tier ?? "beta";

  return (
    <>
      {isFirstVisit && (
        <div
          className="mb-10 border border-ink/10 px-6 py-5 flex items-start gap-4"
          style={{ background: "rgba(200,74,26,0.04)" }}
        >
          <span
            className="font-mono text-rust mt-1"
            style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
          >
            /
          </span>
          <div>
            <p
              className="font-mono text-rust mb-2"
              style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
            >
              WELCOME TO THE BETA
            </p>
            <p
              className="text-ink-soft max-w-[60ch]"
              style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
            >
              You're in. Generate your first Duel API key on the{" "}
              <Link href="/dashboard/settings" className="text-ink underline underline-offset-4 hover:opacity-70">
                Settings
              </Link>{" "}
              page, then point your editor at us with one of the install
              commands. Every routed prompt will show up in this overview.
            </p>
          </div>
        </div>
      )}

      <header className="mb-12">
        <p
          className="font-mono text-ink-faint mb-3"
          style={{ fontSize: "11px", letterSpacing: "0.28em" }}
        >
          / OVERVIEW
        </p>
        <h1
          className="font-display font-medium text-ink"
          style={{
            fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          Hello.
        </h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-12 bg-ink/10 border border-ink/10">
        <StatCard label="/ TIER" value={tier.toUpperCase()} hint={tier === "beta" ? "upgrade in billing" : "active plan"} />
        <StatCard
          label="/ CALLS THIS PERIOD"
          value={`${formatNumber(used)} / ${formatNumber(quota)}`}
          hint={
            quota > 0 ? `${Math.round((used / quota) * 100)}% used` : "no quota"
          }
        />
        <StatCard label="/ SAVED SO FAR" value="$0.00" hint="first call coming soon" />
      </section>

      <section className="border border-ink/10 px-8 py-10 mb-12">
        <p
          className="font-mono text-ink-faint mb-4"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / {tier === "beta" ? "SUBSCRIBE" : "BILLING"}
        </p>
        <h2
          className="font-display font-medium text-ink mb-4 max-w-[28ch]"
          style={{
            fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.022em",
          }}
        >
          {tier === "beta"
            ? "Pick a plan in billing."
            : "Manage your subscription."}
        </h2>
        <Link
          href="/dashboard/billing"
          className="group inline-flex items-center gap-2 font-mono"
          style={{ fontSize: "11.5px", letterSpacing: "0.22em" }}
        >
          <span className="relative whitespace-nowrap text-ink">
            open billing
            <span
              aria-hidden
              className="absolute left-0 right-0 -bottom-1 transition-all duration-300 group-hover:-bottom-1.5"
              style={{ background: "var(--rust)", height: 1 }}
            />
          </span>
          <span
            aria-hidden
            className="translate-x-0 group-hover:translate-x-1 transition-transform"
            style={{ color: "var(--rust)" }}
          >
            →
          </span>
        </Link>
      </section>

      <section className="border border-ink/10 px-8 py-10">
        <p
          className="font-mono text-ink-faint mb-4"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / NEXT STEP
        </p>
        <h2
          className="font-display font-medium text-ink mb-4 max-w-[24ch]"
          style={{
            fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.022em",
          }}
        >
          Plug Duel into your editor.
        </h2>
        <p
          className="text-ink-soft max-w-[58ch] mb-8"
          style={{ fontSize: "1rem", lineHeight: 1.55 }}
        >
          Once you've generated a Duel API key, install our setup helper
          for whichever editor or agent you use. We currently support
          Claude Code, Cursor, Codex CLI, Hermes Agent, and Venice — one
          line per integration.
        </p>
        <Link
          href="/dashboard/settings"
          className="group inline-flex items-center gap-2 font-mono"
          style={{ fontSize: "11.5px", letterSpacing: "0.22em" }}
        >
          <span className="relative whitespace-nowrap text-ink">
            generate your first key
            <span
              aria-hidden
              className="absolute left-0 right-0 -bottom-1 transition-all duration-300 group-hover:-bottom-1.5"
              style={{ background: "var(--rust)", height: 1 }}
            />
          </span>
          <span
            aria-hidden
            className="translate-x-0 group-hover:translate-x-1 transition-transform"
            style={{ color: "var(--rust)" }}
          >
            →
          </span>
        </Link>
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-paper p-8">
      <p
        className="font-mono text-ink-faint mb-4"
        style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
      >
        {label}
      </p>
      <p
        className="font-display font-medium text-ink mb-2"
        style={{
          fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      <p
        className="font-mono text-ink-faint"
        style={{ fontSize: "10px", letterSpacing: "0.22em" }}
      >
        {hint.toUpperCase()}
      </p>
    </div>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
