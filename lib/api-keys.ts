/**
 * Duel API key generation, hashing, and verification.
 *
 * Format: `duel_` + 8-char prefix + `_` + 32-char secret (URL-safe
 * base62). Example: `duel_a1b2c3d4_f8gA0hN1k2L3m4N5o6P7q8R9s0T1u2V3`.
 *
 * The plaintext is shown to the user EXACTLY ONCE at generation time.
 * After that we only have the sha256 hash + the 8-char prefix (the
 * prefix is kept clear so the dashboard can label keys, e.g.
 * `duel_a1b2c3d4_…`, without revealing secrets).
 *
 * Lookup at request time: sha256 the bearer token, look up by hash.
 * Constant-time comparison is unnecessary because we never compare
 * hashes directly — Postgres's unique index match is the verification.
 */

import "server-only";
import { createHash, randomBytes } from "node:crypto";

const PREFIX = "duel_";
const PREFIX_LEN = 8;
const SECRET_LEN = 32;

/**
 * Generate a fresh API key. Returns `{ plaintext, hash, prefix }`.
 * Persist `hash` and `prefix`; surface `plaintext` to the user once
 * then drop it.
 */
export function generateApiKey(): {
  plaintext: string;
  hash: string;
  prefix: string;
} {
  const prefix = base62(randomBytes(8)).slice(0, PREFIX_LEN);
  const secret = base62(randomBytes(32)).slice(0, SECRET_LEN);
  const plaintext = `${PREFIX}${prefix}_${secret}`;
  const hash = sha256(plaintext);
  return { plaintext, hash, prefix };
}

/**
 * Hash a plaintext key for lookup. Returns the same hex digest stored
 * in `duel_api_keys.hash`.
 */
export function hashApiKey(plaintext: string): string {
  return sha256(plaintext);
}

/**
 * Extract the 8-char prefix from a plaintext key, or null if the
 * supplied string doesn't have the expected shape. Used for log lines
 * ("request from duel_a1b2c3d4_…") that should never contain the
 * secret half.
 */
export function extractPrefix(plaintext: string): string | null {
  if (!plaintext.startsWith(PREFIX)) return null;
  const rest = plaintext.slice(PREFIX.length);
  const underscore = rest.indexOf("_");
  if (underscore <= 0) return null;
  const prefix = rest.slice(0, underscore);
  return prefix.length === PREFIX_LEN ? prefix : null;
}

/**
 * Mask a plaintext key for display in case it ever leaks into a UI by
 * mistake. Keeps the prefix readable; redacts the secret. Defensive
 * helper — the secret should never reach the client after creation.
 */
export function maskApiKey(plaintext: string): string {
  const prefix = extractPrefix(plaintext);
  if (!prefix) return "duel_••••••••_••••••••••••••••••••••••••••••••";
  return `${PREFIX}${prefix}_${"•".repeat(SECRET_LEN)}`;
}

/* ─────────────────────────────────────────────────────────── internal */

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Base62 encode a buffer. Used for URL-safe key segments without `+`
 * `/` `=` padding or any character that requires escaping in env files
 * / shell vars.
 */
function base62(buf: Buffer): string {
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (const byte of buf) {
    out += alphabet[byte % 62];
  }
  return out;
}
