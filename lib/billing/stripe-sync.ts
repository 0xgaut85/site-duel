import "server-only";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/db/client";
import {
  quotaForTier,
  tierFromStripePriceId,
  type PaidTier,
} from "@/lib/billing/tiers";

type SubscriptionStatus = (typeof schema.subscriptions.$inferSelect)["status"];

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "grace";
    case "canceled":
      return "cancelled";
    case "unpaid":
    case "incomplete_expired":
      return "expired";
    case "incomplete":
    case "paused":
    default:
      return "active";
  }
}

function resolvePaidTier(sub: Stripe.Subscription): PaidTier | null {
  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  if (!priceId) return null;
  return tierFromStripePriceId(priceId);
}

function periodStart(sub: Stripe.Subscription): Date {
  const item = sub.items.data[0];
  if (item?.current_period_start) {
    return new Date(item.current_period_start * 1000);
  }
  return new Date(sub.start_date * 1000);
}

function periodEnd(sub: Stripe.Subscription): Date {
  const item = sub.items.data[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  const start = periodStart(sub);
  return new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function syncStripeSubscription(
  stripeSub: Stripe.Subscription,
  webhookPayload?: unknown,
): Promise<void> {
  const accountId = stripeSub.metadata.accountId;
  const duelSubscriptionId = stripeSub.metadata.duelSubscriptionId;

  if (!accountId || !duelSubscriptionId) {
    console.warn(
      "[stripe-sync] subscription missing metadata.accountId or duelSubscriptionId:",
      stripeSub.id,
    );
    return;
  }

  const paidTier = resolvePaidTier(stripeSub);
  const isPaidActive =
    paidTier &&
    (stripeSub.status === "active" || stripeSub.status === "trialing");

  const status = mapStripeSubscriptionStatus(stripeSub.status);
  const tier = isPaidActive ? paidTier : "beta";
  const monthlyCallQuota = quotaForTier(tier);

  const customerId =
    typeof stripeSub.customer === "string"
      ? stripeSub.customer
      : stripeSub.customer.id;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.subscriptions)
      .set({
        tier,
        status,
        monthlyCallQuota,
        currentPeriodStart: periodStart(stripeSub),
        currentPeriodEnd: periodEnd(stripeSub),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        graceStartedAt:
          status === "grace" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, duelSubscriptionId));

    const [existingProvider] = await tx
      .select()
      .from(schema.paymentProvider)
      .where(eq(schema.paymentProvider.subscriptionId, duelSubscriptionId))
      .limit(1);

    const providerRow = {
      subscriptionId: duelSubscriptionId,
      provider: "stripe" as const,
      providerSubscriptionId: stripeSub.id,
      providerCustomerId: customerId,
      lastWebhookPayload: webhookPayload ?? null,
      lastSyncedAt: new Date(),
    };

    if (existingProvider) {
      await tx
        .update(schema.paymentProvider)
        .set(providerRow)
        .where(eq(schema.paymentProvider.subscriptionId, duelSubscriptionId));
    } else {
      await tx.insert(schema.paymentProvider).values(providerRow);
    }
  });
}

export async function markSubscriptionGraceFromInvoice(
  stripeSubId: string,
  webhookPayload?: unknown,
): Promise<void> {
  const [provider] = await db
    .select()
    .from(schema.paymentProvider)
    .where(eq(schema.paymentProvider.providerSubscriptionId, stripeSubId))
    .limit(1);

  if (!provider) return;

  await db
    .update(schema.subscriptions)
    .set({
      status: "grace",
      graceStartedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.id, provider.subscriptionId));

  await db
    .update(schema.paymentProvider)
    .set({
      lastWebhookPayload: webhookPayload ?? null,
      lastSyncedAt: new Date(),
    })
    .where(eq(schema.paymentProvider.subscriptionId, provider.subscriptionId));
}
