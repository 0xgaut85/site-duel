/**
 * Better-Auth configuration for Duel Agents.
 *
 * Auth model: passwordless magic links sent via SMTP. Public signup:
 * requesting a magic link for a new email provisions user + account +
 * subscription row, then sends the link. Unknown vs known emails still
 * get the same generic UI response (no enumeration).
 *
 * The Drizzle adapter is wired with our renamed auth tables — the
 * OAuth-style `account` table is called `accounts_auth` to avoid
 * colliding with the product's billing-bearing `accounts` table.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { sendEmail } from "@/lib/email/send";
import {
  magicLinkEmailHtml,
  magicLinkEmailText,
} from "@/lib/email/templates/magic-link";
import { provisionPublicUser } from "@/lib/provision";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (!process.env.BETTER_AUTH_SECRET) {
  // Soft warn at boot — the auth handlers will refuse to start if this
  // is missing, but earlier visibility makes the dev-time error obvious.
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to .env.local.",
  );
}

function createAuth() {
  const db = getDb();
  return betterAuth({
    appName: "Duel Agents",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-do-not-use-in-prod",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accountsAuth,
        verification: schema.verifications,
      },
    }),
    /* No password sign-ins — magic-link only. */
    emailAndPassword: { enabled: false },
    /* Sessions are seven days. Refreshable on activity (Better-Auth's
     * default). Long enough that day-to-day use feels stateless, short
     * enough that a leaked session token doesn't outlive the leak. */
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    plugins: [
      magicLink({
        /* Public signup: provision unknown emails, then send the link.
         * Generic UI response either way (no enumeration). */
        sendMagicLink: async ({ email, url, token: _token }) => {
          const normalised = email.toLowerCase();
          const db = getDb();
          const existing = await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(eq(schema.users.email, normalised))
            .limit(1);

          if (existing.length === 0) {
            await provisionPublicUser(normalised);
          }

          await sendEmail({
            to: normalised,
            subject: "Your Duel Agents sign-in link",
            html: magicLinkEmailHtml(url),
            text: magicLinkEmailText(url),
          });
        },
        /* The link is single-use and expires in 15 minutes. The
         * verification row is auto-deleted by Better-Auth on use. */
        expiresIn: 60 * 15,
      }),
    ],
    trustedOrigins: [baseURL],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | undefined;

/** Lazily constructed so `next build` does not require DATABASE_URL. */
export function getAuth(): AuthInstance {
  if (!authInstance) authInstance = createAuth();
  return authInstance;
}

/**
 * Proxy defers Better-Auth init until first use (runtime), not import
 * time (build). Existing `auth.api.*` call sites keep working.
 */
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});

export type Session = AuthInstance["$Infer"]["Session"];
