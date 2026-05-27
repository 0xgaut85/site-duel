"use client";

import { useState } from "react";
import { LiquidButton } from "./LiquidButton";

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm({ darkBg }: { darkBg?: boolean } = {}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "REQUEST_FAILED");
      }
      setStatus("success");
      setMessage(data.message ?? "You're on the list. Watch the inbox.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const strong = darkBg ? "text-paper" : "text-ink";
  const soft = darkBg ? "text-paper-faint" : "text-ink-soft";
  const fade = darkBg ? "text-paper-faint" : "text-ink-faint";
  const placeholder = darkBg
    ? "placeholder:text-paper-faint"
    : "placeholder:text-ink-faint";
  const divider = darkBg ? "border-paper/25" : "border-ink/20";

  if (status === "success") {
    return (
      <div className="font-mono text-[14px] tracking-[0.14em] space-y-4">
        <div className={`flex items-center gap-3 ${strong}`}>
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full"
            style={{ background: darkBg ? "var(--paper)" : "var(--ink)" }}
          />
          REQUEST_ACCEPTED
        </div>
        <p
          className={`normal-case tracking-normal max-w-[28ch] text-[15px] leading-[1.5] ${soft}`}
        >
          {message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-6" noValidate>
      <label htmlFor="wl-email" className="sr-only">
        Email address
      </label>
      <div className={`border-b ${divider} pb-3`}>
        <input
          id="wl-email"
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={`bg-transparent font-body text-[18px] focus:outline-none w-full py-3 ${strong} ${placeholder}`}
          autoComplete="email"
          inputMode="email"
          spellCheck="false"
        />
      </div>

      <LiquidButton
        loading={status === "loading"}
        disabled={status === "loading"}
        darkBg={darkBg}
      >
        {status === "loading" ? "SENDING…" : "REQUEST ACCESS"}
      </LiquidButton>

      {status === "error" && (
        <p className={`font-mono text-[12px] tracking-[0.14em] ${strong}`}>
          ERR · {message}
        </p>
      )}
      <p className={`font-mono text-[10px] tracking-[0.18em] ${fade}`}>
        · NO MARKETING · ONE EMAIL WHEN ACCESS OPENS ·
      </p>
    </form>
  );
}
