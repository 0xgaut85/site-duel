import "server-only";
import { getSmtpFrom, getSmtpTransport, isEmailConfigured } from "./config";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email via SMTP. In development without SMTP
 * configured, logs the message and returns. In production, throws if
 * SMTP is missing so sign-in cannot fail silently.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const to = input.to.replace(/[\r\n]/g, "").trim();
  if (!to) {
    throw new Error("sendEmail: recipient address is required.");
  }

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.",
      );
    }

    // eslint-disable-next-line no-console
    console.warn("[email] SMTP not configured — skipping send.");
    // eslint-disable-next-line no-console
    console.warn(`[email] To: ${to}`);
    // eslint-disable-next-line no-console
    console.warn(`[email] Subject: ${input.subject}`);
    // eslint-disable-next-line no-console
    console.warn(`[email] Body:\n${input.text}`);
    return;
  }

  const transport = await getSmtpTransport();
  await transport.sendMail({
    from: getSmtpFrom(),
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
