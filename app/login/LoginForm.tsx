"use client";

/**
 * Magic-link sign-in form. Submits the email to Better-Auth's
 * `signIn.magicLink({ email })`; success state hides the form and shows
 * a generic confirmation regardless of whether the email is on file.
 *
 * Intentional UX: we treat unknown emails identically to known emails
 * so the form can't be used to enumerate the user base.
 */

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setState({ kind: "submitting" });

    const { error } = await signIn.magicLink({
      email: trimmed,
      callbackURL: "/dashboard",
    });

    if (error) {
      setState({
        kind: "error",
        message: error.message ?? "Something went wrong. Please try again.",
      });
      return;
    }

    setState({ kind: "sent", email: trimmed });
  };

  if (state.kind === "sent") {
    return (
      <div
        className="border border-ink/10 p-6"
        style={{ background: "rgba(10,10,10,0.02)" }}
      >
        <p
          className="font-mono text-ink-faint mb-3"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / CHECK YOUR INBOX
        </p>
        <p className="text-ink-soft" style={{ fontSize: "0.975rem", lineHeight: 1.55 }}>
          If <span className="text-ink font-medium">{state.email}</span> is on
          file, a sign-in link is on its way. It's valid for 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span
          className="font-mono text-ink-faint"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / EMAIL
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourdomain.com"
          className="bg-transparent border-0 border-b border-ink/30 focus:border-ink outline-none py-2 text-ink placeholder:text-ink-faint transition-colors"
          style={{ fontSize: "1.05rem", letterSpacing: "-0.005em" }}
          disabled={state.kind === "submitting"}
        />
      </label>

      {state.kind === "error" && (
        <p
          className="font-mono text-rust"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          / {state.message.toUpperCase()}
        </p>
      )}

      <button
        type="submit"
        disabled={state.kind === "submitting"}
        className="group self-start mt-2 inline-flex items-center gap-2 font-mono pointer-events-auto disabled:opacity-50"
        style={{ fontSize: "11.5px", letterSpacing: "0.22em" }}
      >
        <span className="relative whitespace-nowrap">
          {state.kind === "submitting" ? "sending link…" : "send sign-in link"}
          <span
            aria-hidden
            className="absolute left-0 right-0 -bottom-1 transition-all duration-300 group-hover:-bottom-1.5"
            style={{ background: "var(--rust)", height: 1 }}
          />
        </span>
        <span
          aria-hidden
          className="translate-x-0 group-hover:translate-x-1 transition-transform"
          style={{ color: "var(--rust)" }}
        >
          →
        </span>
      </button>
    </form>
  );
}
