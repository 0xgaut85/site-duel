import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./store";

let _limiter: Ratelimit | null = null;

/** 5 requests per IP per 10 minutes, sliding window. */
export function getRateLimiter(): Ratelimit | null {
  if (_limiter) return _limiter;
  const redis = getRedis();
  if (!redis) return null;
  _limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "ratelimit:waitlist",
  });
  return _limiter;
}
