/**
 * Invite-from-waitlist flow.
 *
 * `inviteEmail()` is the single source of truth for onboarding new users
 * during the invite-only beta. Called from the admin UI (Phase 3) and
 * usable directly from server-side scripts for bootstrapping the first
 * accounts. Idempotent: if a user with the same email already exists,
 * the existing user/account is reused — we just (re)issue a fresh
 * magic-link sign-in email so the operator can hand it to the invitee.
 *
 * What we do, in one transaction:
 *
 *   1) Mint a `users` row (Better-Auth managed table) with the email
 *      and `emailVerified: true` — the invite IS the verification.
 *   2) Mint a billing-bearing `accounts` row, owner = new user.
 *   3) Mint the owner's `account_members` row.
 *   4) Mint a `subscriptions` row with `tier='beta'` and the granted
 *      quota.
 *   5) Append an `invites` audit-log row pointing at the user + account.
 *   6) Mark the matching `waitlist` row as invited (if one exists).
 *
 * Then OUT of the transaction:
 *
 *   7) Call `auth.api.signInMagicLink` to send the standard magic-link
 *      email via Resend.
 *
 * The magic-link `sendMagicLink` gate in `lib/auth.ts` checks the users
 * table; because step 1 created the row, the email goes through. Any
 * email that hasn't been invited stays unable to receive magic links.
 */

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "@/db/client";
import { auth } from "@/lib/auth";

export interface InviteEmailResult {
  /** True if a fresh user/account was created; false if an existing
   *  one was reused. The magic-link email is sent either way. */
  created: boolean;
  userId: string;
  accountId: string;
  subscriptionId: string;
  inviteId: string;
}

/**
 * Onboard `email` into the invite-only beta and send them a magic-link
 * sign-in email. Returns the newly-created (or reused) entity ids for
 * the caller to display or log.
 *
 * @param email          The email to invite. Normalised to lowercase.
 * @param adminUserId    User id of the admin issuing the invite. Goes
 *                       into the `invites.created_by_user_id` audit
 *                       column.
 * @param grantedQuota   Monthly call quota to seed on the new
 *                       subscription. Defaults to 5,000.
 * @param waitlistId     Optional — if the invite is being issued from
 *                       a row in the `waitlist` table, this links them.
 */
export async function inviteEmail(opts: {
  email: string;
  adminUserId: string;
  grantedQuota?: number;
  waitlistId?: string;
}): Promise<InviteEmailResult> {
  const email = opts.email.trim().toLowerCase();
  const grantedQuota = opts.grantedQuota ?? 5000;

  const result = await db.transaction(async (tx) => {
    /* Step 1 — find or create the user. */
    const [existingUser] = await tx
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    let userId: string;
    let created: boolean;
    let accountId: string;
    let subscriptionId: string;

    if (existingUser) {
      userId = existingUser.id;
      created = false;

      /* Find their existing owned account; create a fresh one if for
       * some reason they don't have one yet (shouldn't happen but
       * defensively idempotent). */
      const [ownedAccount] = await tx
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.ownerId, userId))
        .limit(1);

      if (ownedAccount) {
        accountId = ownedAccount.id;

        const [existingSub] = await tx
          .select({ id: schema.subscriptions.id })
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.accountId, accountId))
          .limit(1);

        if (existingSub) {
          subscriptionId = existingSub.id;
        } else {
          subscriptionId = await insertSubscription(tx, accountId, grantedQuota);
        }
      } else {
        const fresh = await insertAccountForUser(tx, userId, email, grantedQuota);
        accountId = fresh.accountId;
        subscriptionId = fresh.subscriptionId;
      }
    } else {
      userId = nanoid();
      created = true;

      await tx.insert(schema.users).values({
        id: userId,
        email,
        emailVerified: true,
        name: null,
        image: null,
      });

      const fresh = await insertAccountForUser(tx, userId, email, grantedQuota);
      accountId = fresh.accountId;
      subscriptionId = fresh.subscriptionId;
    }

    /* Step 5 — invite audit row. */
    const inviteId = nanoid();
    const token = nanoid(40);
    await tx.insert(schema.invites).values({
      id: inviteId,
      email,
      token,
      status: "consumed", // marked consumed immediately — we sign-in via magic link, not a custom token URL.
      grantedQuota,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      consumedAt: new Date(),
      createdByUserId: opts.adminUserId,
      createdAccountId: accountId,
    });

    /* Step 6 — link the waitlist row, if supplied. */
    if (opts.waitlistId) {
      await tx
        .update(schema.waitlist)
        .set({ invitedInviteId: inviteId })
        .where(eq(schema.waitlist.id, opts.waitlistId));
    }

    return { created, userId, accountId, subscriptionId, inviteId };
  });

  /* Step 7 — fire the magic-link email out of the transaction. The
   * `sendMagicLink` callback in `lib/auth.ts` will see the user we
   * just inserted and proceed to send. `headers` is required by
   * Better-Auth's API contract (used for IP / UA recording on the
   * verification row); we pass a synthetic empty Headers since this
   * call is happening from a server-side helper, not a request. */
  await auth.api.signInMagicLink({
    body: {
      email,
      callbackURL: "/dashboard?welcome=1",
    },
    headers: new Headers(),
  });

  return result;
}

/* ─────────────────────────────────────────────────────────── tx helpers */

async function insertAccountForUser(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
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
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
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
