/**
 * Better-Auth React client.
 *
 * Use `signIn.magicLink({ email })` from sign-in forms, `signOut()` from
 * profile menus, and `useSession()` from any client component that
 * needs to know who the current user is. Imports of `auth-client` are
 * client-safe; never import from `@/lib/auth` in a "use client" file
 * (it pulls Drizzle / Resend into the bundle).
 */

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

const baseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL,
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
