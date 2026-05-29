/**
 * /dashboard — signed-in home: plan status, usage, and setup steps.
 */

import Link from "next/link";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireSession } from "@/lib/session";
import { ensureUserProvisioned } from "@/lib/provision";
import {
  isPaidSubscription,
  tierDisplayHint,
  tierDisplayName,
} from "@/lib/billing/tiers";
import { db, schema } from "@/db/client";

interface PageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = await searchParams;
  const isFirstVisit = params.welcome === "1";

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

  const tier = subscription?.tier ?? "beta";
  const subscribed = isPaidSubscription(tier);
  const quota = subscription?.monthlyCallQuota ?? 0;
  const used = subscription?.callsUsedThisPeriod ?? 0;

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
              YOU&apos;RE SIGNED IN
            </p>
            <p
              className="text-ink-soft max-w-[60ch]"
              style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
            >
              Pick a plan on{" "}
              <Link
                href="/dashboard/billing"
                className="text-ink underline underline-offset-4 hover:opacity-70"
              >
                Billing
              </Link>
              , generate an API key in{" "}
              <Link
                href="/dashboard/settings"
                className="text-ink underline underline-offset-4 hover:opacity-70"
              >
                Settings
              </Link>
              , then point your editor at Duel.
            </p>
          </div>
        </div>
      )}

      <PageHeader label="/ OVERVIEW" title="Hello." />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-12 bg-ink/10 border border-ink/10">
        <StatCard
          label="/ PLAN"
          value={tierDisplayName(tier)}
          hint={tierDisplayHint(tier)}
        />
        <StatCard
          label="/ CALLS THIS PERIOD"
          value={
            subscribed
              ? `${formatNumber(used)} / ${formatNumber(quota)}`
              : "—"
          }
          hint={
            subscribed
              ? quota > 0
                ? `${Math.round((used / quota) * 100)}% used`
                : "no quota"
              : "subscribe to unlock"
          }
        />
        <StatCard label="/ SAVED SO FAR" value="$0.00" hint="updates after first call" />
      </section>

      {!subscribed && (
        <section className="border border-ink/10 px-8 py-10 mb-12">
          <p
            className="font-mono text-ink-faint mb-4"
            style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
          >
            / SUBSCRIBE
          </p>
          <h2
            className="font-display font-medium text-ink mb-4 max-w-[28ch]"
            style={{
              fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.022em",
            }}
          >
            Choose a plan at launch.
          </h2>
          <p
            className="text-ink-soft max-w-[58ch] mb-8"
            style={{ fontSize: "1rem", lineHeight: 1.55 }}
          >
            Indie ($19/mo), Pro ($49/mo), and Team ($199/mo). Subscribe via
            Stripe — card or Stripe Crypto — from the billing page.
          </p>
          <Link
            href="/dashboard/billing"
            className="group inline-flex font-mono"
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
          </Link>
        </section>
      )}

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
          Generate a Duel API key, then install our setup helper for Cursor,
          Claude Code, Codex CLI, Hermes Agent, or Venice.
        </p>
        <Link
          href="/dashboard/settings"
          className="group inline-flex font-mono"
          style={{ fontSize: "11.5px", letterSpacing: "0.22em" }}
        >
          <span className="relative whitespace-nowrap text-ink">
            open settings
            <span
              aria-hidden
              className="absolute left-0 right-0 -bottom-1 transition-all duration-300 group-hover:-bottom-1.5"
              style={{ background: "var(--rust)", height: 1 }}
            />
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
    <div className="bg-paper p-8 border-t-2 border-transparent transition-colors hover:border-rust/40">
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
