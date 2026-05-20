/**
 * Better-Auth route handler.
 *
 * All Better-Auth endpoints (sign-in, sign-out, callback, magic-link
 * consume, session lookup, etc.) hang off `/api/auth/*`. We bind both
 * GET and POST to Better-Auth's universal handler — it dispatches on
 * URL + method internally.
 *
 * Wrapped in the release flag so the auth surface is invisible until
 * `NEXT_PUBLIC_PRODUCT_LIVE=true`. Returns a clean 404 while OFF, just
 * like any other un-served URL on the marketing site.
 */

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { blockIfNotLive } from "@/lib/release";

let handlers: ReturnType<typeof toNextJsHandler> | undefined;

function authHandlers() {
  if (!handlers) handlers = toNextJsHandler(getAuth());
  return handlers;
}

export async function GET(request: Request) {
  const blocked = blockIfNotLive();
  if (blocked) return blocked;
  return authHandlers().GET(request);
}

export async function POST(request: Request) {
  const blocked = blockIfNotLive();
  if (blocked) return blocked;
  return authHandlers().POST(request);
}
