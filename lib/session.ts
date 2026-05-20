/**
 * Server-side session helpers. Use these from route handlers, server
 * components, and server actions to look up the current user / require
 * a particular access level.
 *
 * Read the session by calling `getServerSession()` once per request and
 * passing it to anything that needs it — Better-Auth's underlying call
 * is cheap (one DB lookup) but not free, and the value is cacheable for
 * the lifetime of a single request.
 */

import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Use in any server component / server action that REQUIRES an
 * authenticated user. Redirects to `/login` if the session is missing.
 * Returns the non-null session for the caller.
 */
export async function requireSession() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Same as `requireSession` but additionally enforces that the current
 * user is in the admin allow-list (set via `DUEL_ADMIN_EMAILS` env).
 * Used to protect `/admin` pages and admin-only server actions.
 */
export async function requireAdmin() {
  const session = await requireSession();
  if (!isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }
  return session;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.DUEL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
