"use server";

/**
 * Server actions for the /dashboard/settings page:
 *
 *   - createApiKey: mint a fresh Duel API key bound to the caller's
 *     account. Returns the plaintext exactly once (the client component
 *     decides how to surface it; we never log the plaintext).
 *   - revokeApiKey: soft-revoke a key by setting `revoked_at`. The
 *     `/v1` proxy refuses any key that has a non-null `revoked_at`.
 *
 * Both actions assume the requesting user owns the account that owns
 * the key. The account / membership lookup is the auth boundary.
 */

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db/client";
import { generateApiKey } from "@/lib/api-keys";
import { hasActivePaidSubscription } from "@/lib/billing/subscription-access";
import { requireSession } from "@/lib/session";

export interface CreateApiKeyResult {
  ok: true;
  /** Surfaced to the UI exactly once. */
  plaintext: string;
  prefix: string;
  id: string;
}

export async function createApiKey(formData: FormData): Promise<
  | CreateApiKeyResult
  | { ok: false; error: string }
> {
  const session = await requireSession();
  const name = (formData.get("name") as string | null)?.trim() || null;

  const [account] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  if (!account) {
    return { ok: false, error: "No account found for this user." };
  }

  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.accountId, account.id))
    .limit(1);

  if (!hasActivePaidSubscription(subscription)) {
    return {
      ok: false,
      error: "Subscribe via Stripe on the billing page before creating API keys.",
    };
  }

  const { plaintext, hash, prefix } = generateApiKey();
  const id = nanoid();

  await db.insert(schema.duelApiKeys).values({
    id,
    accountId: account.id,
    hash,
    prefix,
    name,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");

  return { ok: true, plaintext, prefix, id };
}

export async function revokeApiKey(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await requireSession();
  const keyId = (formData.get("keyId") as string | null)?.trim();
  if (!keyId) {
    return { ok: false, error: "Missing key id." };
  }

  const [account] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.ownerId, session.user.id))
    .limit(1);

  if (!account) {
    return { ok: false, error: "No account found for this user." };
  }

  /* Refuse to revoke keys that aren't owned by the caller's account. */
  await db
    .update(schema.duelApiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.duelApiKeys.id, keyId),
        eq(schema.duelApiKeys.accountId, account.id),
      ),
    );

  revalidatePath("/dashboard/settings");
  return { ok: true };
}
