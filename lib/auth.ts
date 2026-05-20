/**
 * Better-Auth configuration for Duel Agents.
 *
 * Auth model: passwordless magic links sent via Resend. Signup is
 * invite-only: a user account is created when an admin-issued invite
 * token is consumed at `/invite/[token]`. After that, the user signs in
 * by entering their email at `/login` — Better-Auth sends a magic link
 * that the user clicks to receive a session. We refuse to send magic
 * links to emails that don't already have a user row, which closes the
 * "request magic link to any email" backdoor that would otherwise
 * bypass the invite gate.
 *
 * The Drizzle adapter is wired with our renamed auth tables — the
 * OAuth-style `account` table is called `accounts_auth` to avoid
 * colliding with the product's billing-bearing `accounts` table.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom =
  process.env.RESEND_FROM_EMAIL ?? "Duel Agents <hello@duel-agents.com>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

if (!process.env.BETTER_AUTH_SECRET) {
  // Soft warn at boot — the auth handlers will refuse to start if this
  // is missing, but earlier visibility makes the dev-time error obvious.
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to .env.local.",
  );
}

export const auth = betterAuth({
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
      /* `sendMagicLink` is called by Better-Auth whenever a user
       * requests sign-in. We intercept here to enforce the invite-only
       * gate: silently no-op if the email has never been invited.
       *
       * Returning without throwing keeps the UI response generic
       * ("we sent you a link if your email is on file") — preventing
       * email-enumeration of who is and isn't an invited user. */
      sendMagicLink: async ({ email, url, token: _token }) => {
        const existing = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, email.toLowerCase()))
          .limit(1);

        if (existing.length === 0) {
          // Email not invited yet. Silently do nothing.
          return;
        }

        if (!resend) {
          // eslint-disable-next-line no-console
          console.warn(
            "[auth] RESEND_API_KEY missing — magic-link email skipped. Link was:",
            url,
          );
          return;
        }

        await resend.emails.send({
          from: resendFrom,
          to: email,
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

export type Session = typeof auth.$Infer.Session;

/* ─────────────────────────────────────────────────────────── email templates
 *
 * Kept inline because they're tiny. Once we add more transactional
 * templates (invite, low-quota, plan-changed) we should extract them
 * into `lib/email/` with shared layout fragments.
 */

function magicLinkEmailHtml(url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:40px 20px;background:#0e0e0c;color:#d6d5d0;font-family:'Inter',-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px;background:#171715;border:1px solid rgba(255,255,255,0.06);">
      <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.28em;color:#8a8a86;margin:0 0 24px;">/ DUEL AGENTS · SIGN IN</p>
      <h1 style="font-size:24px;line-height:1.2;font-weight:500;letter-spacing:-0.025em;margin:0 0 16px;color:#f3f2ed;">Your sign-in link.</h1>
      <p style="margin:0 0 24px;line-height:1.55;color:#c2c1bc;">Click the button below to sign in. The link is valid for 15 minutes and can only be used once.</p>
      <a href="${url}" style="display:inline-block;padding:14px 22px;background:#c84a1a;color:#ffffff;text-decoration:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Sign in to Duel Agents →</a>
      <p style="margin:28px 0 0;font-size:12px;color:#8a8a86;line-height:1.55;">If you didn't request this email, you can ignore it.</p>
    </div>
  </body>
</html>`;
}

function magicLinkEmailText(url: string): string {
  return `Your sign-in link for Duel Agents.

Open this link in your browser to sign in. Valid for 15 minutes, single use.

${url}

If you didn't request this email, you can ignore it.`;
}
