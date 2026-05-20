import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

const SET_KEY = "waitlist:emails";
const LIST_KEY = "waitlist:log";

export interface WaitlistEntry {
  email: string;
  ip?: string;
  userAgent?: string;
  ts: number;
}

/**
 * Adds an email to the waitlist. Returns true if newly added, false if already present.
 * Falls back to a no-op (returns true) when Redis isn't configured so local dev works
 * without env vars set.
 */
export async function addToWaitlist(entry: WaitlistEntry): Promise<{ added: boolean; total: number }> {
  const redis = getRedis();
  if (!redis) {
    console.warn("[waitlist] Upstash Redis not configured; skipping persistence.");
    return { added: true, total: 0 };
  }
  const added = await redis.sadd(SET_KEY, entry.email.toLowerCase());
  const total = await redis.scard(SET_KEY);
  if (added) {
    await redis.lpush(LIST_KEY, JSON.stringify(entry));
    await redis.ltrim(LIST_KEY, 0, 9999); // keep latest 10k entries
  }
  return { added: added === 1, total };
}
