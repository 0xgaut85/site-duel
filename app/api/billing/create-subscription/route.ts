import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getAccountBillingContext } from "@/lib/billing/account";
import { getStripePriceId, type PaidTier } from "@/lib/billing/tiers";
import { db, schema } from "@/db/client";

export const runtime = "nodejs";

const Body = z.object({
  tier: z.enum(["indie", "pro", "team"]),
});

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Billing is not configured on this server." },
      { status: 503 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const priceId = getStripePriceId(parsed.tier as PaidTier);
  if (!priceId) {
    return NextResponse.json(
      {
        ok: false,
        message: `Stripe price for ${parsed.tier} is not configured.`,
      },
      { status: 503 },
    );
  }

  const { accountId, subscriptionId, userEmail } =
    await getAccountBillingContext(session.user.id, session.user.email);

  const stripe = getStripe();

  const [existingProvider] = await db
    .select()
    .from(schema.paymentProvider)
    .where(eq(schema.paymentProvider.subscriptionId, subscriptionId))
    .limit(1);

  let customerId = existingProvider?.providerCustomerId ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        accountId,
        duelSubscriptionId: subscriptionId,
      },
    });
    customerId = customer.id;

    if (existingProvider) {
      await db
        .update(schema.paymentProvider)
        .set({
          provider: "stripe",
          providerCustomerId: customerId,
          lastSyncedAt: new Date(),
        })
        .where(eq(schema.paymentProvider.subscriptionId, subscriptionId));
    } else {
      await db.insert(schema.paymentProvider).values({
        subscriptionId,
        provider: "stripe",
        providerCustomerId: customerId,
        lastSyncedAt: new Date(),
      });
    }
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: {
      accountId,
      duelSubscriptionId: subscriptionId,
      tier: parsed.tier,
    },
  });

  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string") {
    return NextResponse.json(
      { ok: false, message: "Could not create payment for subscription." },
      { status: 500 },
    );
  }

  const clientSecret = invoice.confirmation_secret?.client_secret;
  if (!clientSecret) {
    return NextResponse.json(
      { ok: false, message: "Payment intent is missing a client secret." },
      { status: 500 },
    );
  }

  await db
    .update(schema.paymentProvider)
    .set({
      providerSubscriptionId: subscription.id,
      lastSyncedAt: new Date(),
    })
    .where(eq(schema.paymentProvider.subscriptionId, subscriptionId));

  return NextResponse.json({
    ok: true,
    clientSecret,
    stripeSubscriptionId: subscription.id,
  });
}
