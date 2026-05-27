/**
 * Better-Auth route handler.
 *
 * All Better-Auth endpoints (sign-in, sign-out, callback, magic-link
 * consume, session lookup, etc.) hang off `/api/auth/*`. We bind both
 * GET and POST to Better-Auth's universal handler — it dispatches on
 * URL + method internally.
 */

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

let handlers: ReturnType<typeof toNextJsHandler> | undefined;

function authHandlers() {
  if (!handlers) handlers = toNextJsHandler(getAuth());
  return handlers;
}

export async function GET(request: Request) {
  return authHandlers().GET(request);
}

export async function POST(request: Request) {
  return authHandlers().POST(request);
}
