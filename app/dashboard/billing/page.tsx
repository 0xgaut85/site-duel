import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { ensureUserProvisioned } from "@/lib/provision";
import { PAID_TIERS, tierDisplayName, isPaidSubscription } from "@/lib/billing/tiers";
import { isCryptoBillingConfigured } from "@/lib/billing/crypto/config";
import { db, schema } from "@/db/client";
import { BillingCheckout } from "./BillingCheckout";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await requireSession();

  let [account] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  if (!account && session.user.email) {
    const provisioned = await ensureUserProvisioned(
      session.user.id,
      session.user.email,
    );
    account = { id: provisioned.accountId };
  }

  const [subscription] = account
    ? await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.accountId, account.id))
        .limit(1)
    : [];

  const tier = subscription?.tier ?? "beta";
  const status = subscription?.status ?? "active";
  const subscribed = isPaidSubscription(tier);

  return (
    <>
      <header className="mb-12">
        <p
          className="font-mono text-ink-faint mb-3"
          style={{ fontSize: "11px", letterSpacing: "0.28em" }}
        >
          / BILLING
        </p>
        <h1
          className="font-display font-medium text-ink"
          style={{
            fontSize: "clamp(2rem, 3.4vw, 2.8rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          Subscription.
        </h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-12 bg-ink/10 border border-ink/10">
        <StatCard label="/ PLAN" value={tierDisplayName(tier)} />
        <StatCard label="/ STATUS" value={status.toUpperCase()} />
        <StatCard
          label="/ CALLS THIS PERIOD"
          value={
            subscribed
              ? `${formatNumber(subscription?.callsUsedThisPeriod ?? 0)} / ${formatNumber(subscription?.monthlyCallQuota ?? 0)}`
              : "—"
          }
        />
      </section>

      <BillingCheckout
        tiers={PAID_TIERS}
        currentTier={tier}
        cryptoConfigured={isCryptoBillingConfigured()}
      />
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-8">
      <p
        className="font-mono text-ink-faint mb-4"
        style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
      >
        {label}
      </p>
      <p
        className="font-display font-medium text-ink"
        style={{
          fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
