import { getResend } from "@/lib/waitlist/resend";
import type { CryptoChain } from "@/lib/billing/crypto/config";
import { EXPLORER_TX_URL } from "@/lib/billing/crypto/config";
import { formatMicroUsdc } from "@/lib/billing/crypto/amounts";
import type { PaidTier } from "@/lib/billing/tiers";
import { getTierConfig } from "@/lib/billing/tiers";

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Duel Agents <hello@duelagents.com>";

export async function sendCryptoPaymentConfirmation(opts: {
  to: string;
  tier: PaidTier;
  amountMicroUsdc: number;
  chain: CryptoChain;
  txHash: string;
  periodEnd: Date;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[billing] Resend not configured; skipping payment email.");
    return;
  }

  const tierLabel = getTierConfig(opts.tier).label;
  const amount = formatMicroUsdc(opts.amountMicroUsdc);
  const explorer = `${EXPLORER_TX_URL[opts.chain]}${opts.txHash}`;
  const periodEnd = opts.periodEnd.toLocaleDateString("en-US", {
    dateStyle: "long",
  });

  await resend.emails.send({
    from: FROM,
    to: opts.to.replace(/[\r\n]/g, ""),
    subject: `Duel Agents: ${tierLabel} subscription confirmed`,
    text: [
      "Payment received via Stripe Crypto.",
      "",
      `Plan: ${tierLabel}`,
      `Amount: ${amount} USDC`,
      `Payment details: ${explorer}`,
      `Active until: ${periodEnd}`,
      "",
      "You can now create API keys in Settings and start routing through Duel Agents.",
      "",
      "- Duel Agents",
      "https://duelagents.com/dashboard",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:40px 20px;background:#0e0e0c;color:#d6d5d0;font-family:'Inter',-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px;background:#171715;border:1px solid rgba(255,255,255,0.06);">
      <p style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.28em;color:#8a8a86;margin:0 0 24px;">/ DUEL AGENTS · PAYMENT CONFIRMED</p>
      <h1 style="font-size:24px;line-height:1.2;font-weight:500;margin:0 0 16px;color:#f3f2ed;">You're on ${tierLabel}.</h1>
      <p style="margin:0 0 12px;line-height:1.55;color:#c2c1bc;">Paid via <strong>Stripe Crypto</strong></p>
      <p style="margin:0 0 12px;line-height:1.55;color:#c2c1bc;">Amount: <strong>${amount} USDC</strong></p>
      <p style="margin:0 0 12px;line-height:1.55;color:#c2c1bc;">Active until: <strong>${periodEnd}</strong></p>
      <p style="margin:0 0 24px;line-height:1.55;color:#c2c1bc;"><a href="${explorer}" style="color:#c84a1a;">View payment details</a></p>
      <a href="https://duelagents.com/dashboard/settings" style="display:inline-block;padding:14px 22px;background:#c84a1a;color:#ffffff;text-decoration:none;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Create API keys →</a>
    </div>
  </body>
</html>`,
  });
}
