import type { NextRequest } from "next/server";

const KEY_PATTERN = /^duel_[0-9a-zA-Z]{8}_[0-9a-zA-Z]{32}$/;

export function extractApiKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const xApiKey = req.headers.get("x-api-key")?.trim();
  if (xApiKey) return xApiKey;

  return null;
}

export function isValidKeyShape(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
