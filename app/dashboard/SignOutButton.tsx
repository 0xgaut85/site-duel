"use client";

/**
 * Topbar sign-out button. Calls Better-Auth's client-side `signOut`
 * and hard-redirects to `/login` so any cached server-component
 * fragments are dropped along with the session cookie.
 */

import { useState } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-mono text-ink-faint hover:text-ink transition-colors disabled:opacity-50"
      style={{ fontSize: "10px", letterSpacing: "0.28em" }}
    >
      {pending ? "..." : "SIGN OUT"}
    </button>
  );
}
