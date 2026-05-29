import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL || "Duel Agents <hello@duelagents.com>";
const NOTIFY = process.env.RESEND_NOTIFY_EMAIL;

/**
 * Sends:
 *  1. A confirmation to the user (transactional, plain).
 *  2. An internal notification (best-effort) to RESEND_NOTIFY_EMAIL if set.
 *
 * Returns silently on missing config so local dev works.
 */
export async function sendWaitlistEmails(email: string, total: number): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[waitlist] Resend not configured; skipping email.");
    return;
  }

  const safeEmail = email.replace(/[\r\n]/g, "");

  // 1. confirmation to user
  const confirmationPromise = resend.emails.send({
    from: FROM,
    to: safeEmail,
    subject: "You're on the Duel Agents waitlist",
    text: [
      "You're in.",
      "",
      "We'll send you a single email when private access opens.",
      "No marketing, no nonsense.",
      "",
      "- Duel Agents",
      "https://duelagents.com",
    ].join("\n"),
  });

  const promises: Promise<unknown>[] = [confirmationPromise];

  // 2. internal notification (optional)
  if (NOTIFY) {
    promises.push(
      resend.emails.send({
        from: FROM,
        to: NOTIFY,
        subject: `+1 waitlist: ${safeEmail} (total: ${total})`,
        text: `New waitlist signup\n\n  ${safeEmail}\n  total: ${total}\n  at:    ${new Date().toISOString()}`,
      }),
    );
  }

  await Promise.allSettled(promises);
}
