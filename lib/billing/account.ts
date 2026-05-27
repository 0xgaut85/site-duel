import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { ensureUserProvisioned } from "@/lib/provision";

export interface AccountBillingContext {
  accountId: string;
  subscriptionId: string;
  userEmail: string;
}

export async function getAccountBillingContext(
  userId: string,
  email: string,
): Promise<AccountBillingContext> {
  let [account] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, userId))
    .limit(1);

  if (!account) {
    const provisioned = await ensureUserProvisioned(userId, email);
    account = { id: provisioned.accountId };
  }

  const [subscription] = await db
    .select({ id: schema.subscriptions.id })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.accountId, account.id))
    .limit(1);

  if (!subscription) {
    throw new Error("Account is missing a subscription row.");
  }

  return {
    accountId: account.id,
    subscriptionId: subscription.id,
    userEmail: email,
  };
}
