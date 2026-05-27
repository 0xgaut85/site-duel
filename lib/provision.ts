/**
 * Public signup provisioning — creates user + account + beta subscription
 * when someone requests a magic link for the first time.
 */

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db/client";

export interface ProvisionResult {
  created: boolean;
  userId: string;
  accountId: string;
  subscriptionId: string;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function provisionPublicUser(
  rawEmail: string,
  grantedQuota = 5000,
): Promise<ProvisionResult> {
  const email = rawEmail.trim().toLowerCase();
  const db = getDb();

  return db.transaction(async (tx) => {
    const [existingUser] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser) {
      const owned = await ensureAccountForUser(
        tx,
        existingUser.id,
        email,
        grantedQuota,
      );
      return {
        created: false,
        userId: existingUser.id,
        ...owned,
      };
    }

    const userId = nanoid();
    await tx.insert(schema.users).values({
      id: userId,
      email,
      emailVerified: false,
      name: null,
      image: null,
    });

    const owned = await insertAccountForUser(tx, userId, email, grantedQuota);
    return { created: true, userId, ...owned };
  });
}

/** Safety net for signed-in users missing an account row. */
export async function ensureUserProvisioned(
  userId: string,
  email: string,
): Promise<{ accountId: string; subscriptionId: string }> {
  const db = getDb();
  return db.transaction(async (tx) =>
    ensureAccountForUser(tx, userId, email, 5000),
  );
}

async function ensureAccountForUser(
  tx: Tx,
  userId: string,
  email: string,
  grantedQuota: number,
): Promise<{ accountId: string; subscriptionId: string }> {
  const [ownedAccount] = await tx
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, userId))
    .limit(1);

  if (ownedAccount) {
    const [existingSub] = await tx
      .select({ id: schema.subscriptions.id })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.accountId, ownedAccount.id))
      .limit(1);

    if (existingSub) {
      return {
        accountId: ownedAccount.id,
        subscriptionId: existingSub.id,
      };
    }

    const subscriptionId = await insertSubscription(
      tx,
      ownedAccount.id,
      grantedQuota,
    );
    return { accountId: ownedAccount.id, subscriptionId };
  }

  return insertAccountForUser(tx, userId, email, grantedQuota);
}

async function insertAccountForUser(
  tx: Tx,
  userId: string,
  email: string,
  grantedQuota: number,
): Promise<{ accountId: string; subscriptionId: string }> {
  const accountId = nanoid();
  const name = email.split("@")[0] || "personal";

  await tx.insert(schema.accounts).values({
    id: accountId,
    name,
    ownerId: userId,
  });

  await tx.insert(schema.accountMembers).values({
    accountId,
    userId,
    role: "owner",
  });

  const subscriptionId = await insertSubscription(tx, accountId, grantedQuota);
  return { accountId, subscriptionId };
}

async function insertSubscription(
  tx: Tx,
  accountId: string,
  grantedQuota: number,
): Promise<string> {
  const subscriptionId = nanoid();
  await tx.insert(schema.subscriptions).values({
    id: subscriptionId,
    accountId,
    tier: "beta",
    status: "active",
    monthlyCallQuota: grantedQuota,
    callsUsedThisPeriod: 0,
  });
  return subscriptionId;
}
