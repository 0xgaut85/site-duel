/**
 * Release flag — the single switch that controls whether the v1
 * product (login + dashboard + Better-Auth endpoints) is exposed to
 * the public. While OFF, the site behaves exactly like the pre-Phase-1
 * marketing-only build: `/login`, `/dashboard`, `/api/auth/*` all
 * 404, and there are no links to them from the marketing pages.
 *
 * `NEXT_PUBLIC_*` so client components can read it too — the marketing
 * carousel can conditionally surface a "Sign in" link based on the
 * same flag without an extra round trip.
 *
 * Default is OFF. Flip to `true` in your deploy env when the dashboard
 * is ready for users to see it. Leave it as `true` in `.env.local` if
 * you're actively building the product locally.
 */

export function isProductLive(): boolean {
  /* Accept literal "true" only; any other value (including empty
   * string, undefined, "1", "yes") is treated as off. Removes
   * ambiguity at the call sites. */
  return process.env.NEXT_PUBLIC_PRODUCT_LIVE === "true";
}

/**
 * Helper for route handlers. Returns a 404 Response if the product
 * isn't live; returns null to mean "proceed". Use as:
 *
 *   const blocked = blockIfNotLive();
 *   if (blocked) return blocked;
 */
export function blockIfNotLive(): Response | null {
  if (isProductLive()) return null;
  return new Response("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain" },
  });
}
