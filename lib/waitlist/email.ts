import { sendEmail } from "@/lib/email/send";

const NOTIFY = process.env.SMTP_NOTIFY_EMAIL?.trim();

/**
 * Sends:
 *  1. A confirmation to the user (transactional, plain).
 *  2. An internal notification (best-effort) to SMTP_NOTIFY_EMAIL if set.
 *
 * Returns silently on missing SMTP in development so local dev works.
 */
export async function sendWaitlistEmails(email: string, total: number): Promise<void> {
  const safeEmail = email.replace(/[\r\n]/g, "");

  const confirmationPromise = sendEmail({
    to: safeEmail,
    subject: "You're on the Duel Agents waitlist",
    text: [
      "You're in.",
      "",
      "We'll send you a single email when private access opens.",
      "No marketing, no nonsense.",
      "",
      "— Duel Agents",
      "https://duelagents.com",
    ].join("\n"),
    html: [
      "<p>You're in.</p>",
      "<p>We'll send you a single email when private access opens. No marketing, no nonsense.</p>",
      "<p>— Duel Agents<br><a href=\"https://duelagents.com\">duelagents.com</a></p>",
    ].join("\n"),
  });

  const promises: Promise<void>[] = [confirmationPromise];

  if (NOTIFY) {
    promises.push(
      sendEmail({
        to: NOTIFY,
        subject: `+1 waitlist: ${safeEmail} (total: ${total})`,
        text: `New waitlist signup\n\n  ${safeEmail}\n  total: ${total}\n  at:    ${new Date().toISOString()}`,
        html: `<p>New waitlist signup</p><pre>${safeEmail}\ntotal: ${total}\nat: ${new Date().toISOString()}</pre>`,
      }),
    );
  }

  await Promise.allSettled(promises);
}
