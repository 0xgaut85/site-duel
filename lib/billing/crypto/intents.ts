import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db/client";
import type { CryptoPaymentIntent } from "@/db/schema";
import {
  buildUniqueAmountMicroUsdc,
  formatMicroUsdc,
} from "@/lib/billing/crypto/amounts";
import {
  getTreasuryAddress,
  INTENT_TTL_MS,
  type CryptoChain,
} from "@/lib/billing/crypto/config";
import { sendCryptoPaymentConfirmation } from "@/lib/billing/crypto/email";
import {
  explorerUrl,
  findMatchingUsdcTransfer,
  getCurrentBlockNumber,
  verifyUsdcTransferTx,
} from "@/lib/billing/crypto/verify";
import type { Hash } from "viem";
import { getAccountBillingContext } from "@/lib/billing/account";
import { quotaForTier, type PaidTier } from "@/lib/billing/tiers";

export interface CreateIntentResult {
  intentId: string;
  amountUsdc: string;
  amountMicroUsdc: number;
  treasuryAddress: string;
  chain: CryptoChain;
  tier: PaidTier;
  expiresAt: string;
}

export async function createCryptoPaymentIntent(opts: {
  userId: string;
  email: string;
  tier: PaidTier;
  chain: CryptoChain;
}): Promise<CreateIntentResult> {
  const treasury = getTreasuryAddress();
  if (!treasury) {
    throw new Error("Crypto billing is not configured.");
  }

  const { accountId, subscriptionId } = await getAccountBillingContext(
    opts.userId,
    opts.email,
  );

  const scanFromBlock = await getCurrentBlockNumber(opts.chain);
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);

  let amountMicroUsdc = 0;
  let intentId = "";

  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = Math.floor(Math.random() * 999_999) + 1;
    amountMicroUsdc = buildUniqueAmountMicroUsdc(opts.tier, suffix);
    intentId = nanoid();

    const [collision] = await db
      .select({ id: schema.cryptoPaymentIntents.id })
      .from(schema.cryptoPaymentIntents)
      .where(
        and(
          eq(schema.cryptoPaymentIntents.status, "pending"),
          eq(schema.cryptoPaymentIntents.chain, opts.chain),
          eq(schema.cryptoPaymentIntents.amountMicroUsdc, amountMicroUsdc),
        ),
      )
      .limit(1);

    if (collision) continue;

    try {
      await db.insert(schema.cryptoPaymentIntents).values({
        id: intentId,
        accountId,
        subscriptionId,
        tier: opts.tier,
        chain: opts.chain,
        amountMicroUsdc,
        status: "pending",
        scanFromBlock: Number(scanFromBlock),
        expiresAt,
      });
      break;
    } catch (err) {
      if (attempt === 7) throw err;
    }
  }

  return {
    intentId,
    amountUsdc: formatMicroUsdc(amountMicroUsdc),
    amountMicroUsdc,
    treasuryAddress: treasury,
    chain: opts.chain,
    tier: opts.tier,
    expiresAt: expiresAt.toISOString(),
  };
}

async function expireStaleIntent(intent: CryptoPaymentIntent): Promise<void> {
  if (intent.status !== "pending") return;
  if (intent.expiresAt.getTime() > Date.now()) return;

  await db
    .update(schema.cryptoPaymentIntents)
    .set({ status: "expired" })
    .where(eq(schema.cryptoPaymentIntents.id, intent.id));
  intent.status = "expired";
}

async function fulfillIntent(
  intent: CryptoPaymentIntent,
  txHash: string,
  userEmail: string,
): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const tier = intent.tier as PaidTier;

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.cryptoPaymentIntents)
      .set({
        status: "confirmed",
        matchedTxHash: txHash,
        matchedAt: now,
      })
      .where(
        sql`${schema.cryptoPaymentIntents.id} = ${intent.id} AND ${schema.cryptoPaymentIntents.status} = 'pending'`,
      )
      .returning();

    if (!updated) return;

    await tx
      .update(schema.subscriptions)
      .set({
        tier,
        status: "active",
        monthlyCallQuota: quotaForTier(tier),
        callsUsedThisPeriod: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        graceStartedAt: null,
        updatedAt: now,
      })
      .where(eq(schema.subscriptions.id, intent.subscriptionId));

    await tx
      .insert(schema.paymentProvider)
      .values({
        subscriptionId: intent.subscriptionId,
        provider: "crypto",
        providerSubscriptionId: txHash,
        providerCustomerId: intent.chain,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.paymentProvider.subscriptionId,
        set: {
          provider: "crypto",
          providerSubscriptionId: txHash,
          providerCustomerId: intent.chain,
          lastSyncedAt: now,
        },
      });
  });

  await sendCryptoPaymentConfirmation({
    to: userEmail,
    tier,
    amountMicroUsdc: intent.amountMicroUsdc,
    chain: intent.chain,
    txHash,
    periodEnd,
  });
}

export interface IntentStatusResult {
  status: "pending" | "confirmed" | "expired";
  tier?: PaidTier;
  txHash?: string;
  explorerUrl?: string;
  amountUsdc?: string;
}

export async function getCryptoIntentStatus(opts: {
  intentId: string;
  accountId: string;
  userEmail: string;
}): Promise<IntentStatusResult | null> {
  const [intent] = await db
    .select()
    .from(schema.cryptoPaymentIntents)
    .where(eq(schema.cryptoPaymentIntents.id, opts.intentId))
    .limit(1);

  if (!intent || intent.accountId !== opts.accountId) return null;

  await expireStaleIntent(intent);

  if (intent.status === "confirmed" && intent.matchedTxHash) {
    return {
      status: "confirmed",
      tier: intent.tier as PaidTier,
      txHash: intent.matchedTxHash,
      explorerUrl: explorerUrl(intent.chain, intent.matchedTxHash),
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  if (intent.status === "expired") {
    return {
      status: "expired",
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  const claimedHashes = await db
    .select({ hash: schema.cryptoPaymentIntents.matchedTxHash })
    .from(schema.cryptoPaymentIntents)
    .where(eq(schema.cryptoPaymentIntents.status, "confirmed"));

  const match = await findMatchingUsdcTransfer({
    chain: intent.chain,
    amountMicroUsdc: intent.amountMicroUsdc,
    scanFromBlock: BigInt(intent.scanFromBlock),
    excludeTxHashes: claimedHashes
      .map((r) => r.hash)
      .filter((h): h is string => Boolean(h)) as Hash[],
  });

  if (match) {
    await fulfillIntent(intent, match.txHash, opts.userEmail);
    return {
      status: "confirmed",
      tier: intent.tier as PaidTier,
      txHash: match.txHash,
      explorerUrl: explorerUrl(intent.chain, match.txHash),
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  return {
    status: "pending",
    amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
  };
}

export async function submitCryptoPaymentTx(opts: {
  intentId: string;
  txHash: string;
  accountId: string;
  userEmail: string;
}): Promise<IntentStatusResult | null> {
  const [intent] = await db
    .select()
    .from(schema.cryptoPaymentIntents)
    .where(eq(schema.cryptoPaymentIntents.id, opts.intentId))
    .limit(1);

  if (!intent || intent.accountId !== opts.accountId) return null;

  await expireStaleIntent(intent);

  if (intent.status === "confirmed" && intent.matchedTxHash) {
    return {
      status: "confirmed",
      tier: intent.tier as PaidTier,
      txHash: intent.matchedTxHash,
      explorerUrl: explorerUrl(intent.chain, intent.matchedTxHash),
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  if (intent.status === "expired") {
    return {
      status: "expired",
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  const treasury = getTreasuryAddress();
  if (!treasury) {
    throw new Error("Crypto billing is not configured.");
  }

  const [existingClaim] = await db
    .select({ id: schema.cryptoPaymentIntents.id })
    .from(schema.cryptoPaymentIntents)
    .where(
      and(
        eq(schema.cryptoPaymentIntents.status, "confirmed"),
        eq(schema.cryptoPaymentIntents.chain, intent.chain),
        eq(schema.cryptoPaymentIntents.matchedTxHash, opts.txHash),
      ),
    )
    .limit(1);

  if (existingClaim && existingClaim.id !== intent.id) {
    return {
      status: "pending",
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  const match = await verifyUsdcTransferTx({
    chain: intent.chain,
    txHash: opts.txHash as Hash,
    treasury,
    amountMicroUsdc: intent.amountMicroUsdc,
  });

  if (!match) {
    return {
      status: "pending",
      amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
    };
  }

  await fulfillIntent(intent, match.txHash, opts.userEmail);

  return {
    status: "confirmed",
    tier: intent.tier as PaidTier,
    txHash: match.txHash,
    explorerUrl: explorerUrl(intent.chain, match.txHash),
    amountUsdc: formatMicroUsdc(intent.amountMicroUsdc),
  };
}
