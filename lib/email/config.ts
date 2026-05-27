import "server-only";
import type nodemailer from "nodemailer";

declare global {
  // eslint-disable-next-line no-var
  var __duel_smtp__: nodemailer.Transporter | undefined;
}

export function getSmtpFrom(): string {
  return process.env.SMTP_FROM ?? "Duel Agents <hello@duelagents.com>";
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function getSmtpPort(): number {
  const raw = process.env.SMTP_PORT?.trim();
  if (!raw) return 587;
  const port = Number.parseInt(raw, 10);
  return Number.isFinite(port) ? port : 587;
}

/** Lazily opens the SMTP transporter. Safe to import during `next build`. */
export async function getSmtpTransport(): Promise<nodemailer.Transporter> {
  if (globalThis.__duel_smtp__) return globalThis.__duel_smtp__;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    );
  }

  const nodemailer = await import("nodemailer");
  globalThis.__duel_smtp__ = nodemailer.createTransport({
    host,
    port: getSmtpPort(),
    secure: getSmtpPort() === 465,
    auth: { user, pass },
  });

  return globalThis.__duel_smtp__;
}
