"use client";

/**
 * API keys panel — lists existing keys, opens a "create new key"
 * dialog, and surfaces the freshly-minted plaintext exactly once
 * before the user navigates away.
 *
 * The list is fully driven by the server-side props supplied by the
 * settings page. Mutating actions (create, revoke) go through the
 * server actions in `./actions.ts` and use `revalidatePath` to refresh
 * the list — no manual state mirroring.
 */

import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "./actions";

interface KeyRow {
  id: string;
  prefix: string;
  name: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

interface FreshKey {
  id: string;
  prefix: string;
  plaintext: string;
}

export function ApiKeysSection({
  keys,
  canCreateKeys,
}: {
  keys: KeyRow[];
  canCreateKeys: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [freshKey, setFreshKey] = useState<FreshKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await createApiKey(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFreshKey({
        id: res.id,
        prefix: res.prefix,
        plaintext: res.plaintext,
      });
      setShowCreate(false);
    });
  };

  const onRevoke = (keyId: string) => {
    if (!confirm("Revoke this key? Any client using it will start receiving 401s immediately.")) {
      return;
    }
    const fd = new FormData();
    fd.set("keyId", keyId);
    startTransition(async () => {
      const res = await revokeApiKey(fd);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-6 gap-6">
        <div>
          <p
            className="font-mono text-ink-faint mb-2"
            style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
          >
            / API KEYS
          </p>
          <h2
            className="font-display font-medium text-ink"
            style={{
              fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.022em",
            }}
          >
            Your Duel keys.
          </h2>
        </div>
        <button
          type="button"
          disabled={!canCreateKeys}
          onClick={() => {
            if (!canCreateKeys) return;
            setShowCreate(true);
            setFreshKey(null);
            setError(null);
          }}
          className="group inline-flex items-center gap-2 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          <span className="relative whitespace-nowrap text-ink">
            new key
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
            +
          </span>
        </button>
      </div>

      {freshKey && <FreshKeyBanner fresh={freshKey} onDismiss={() => setFreshKey(null)} />}
      {!canCreateKeys && (
        <p
          className="text-ink-soft mb-6 max-w-[50ch]"
          style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
        >
          Subscribe via Stripe on the{" "}
          <a href="/dashboard/billing" className="text-ink underline-offset-4 hover:underline">
            billing page
          </a>{" "}
          before creating API keys.
        </p>
      )}
      {error && (
        <p
          className="font-mono text-rust mb-4"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          / {error.toUpperCase()}
        </p>
      )}

      {showCreate && canCreateKeys && (
        <form
          action={onCreate}
          className="border border-ink/10 p-6 mb-6"
          style={{ background: "rgba(10,10,10,0.02)" }}
        >
          <label className="flex flex-col gap-2 mb-4">
            <span
              className="font-mono text-ink-faint"
              style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
            >
              / NICKNAME (OPTIONAL)
            </span>
            <input
              type="text"
              name="name"
              placeholder="laptop · ci · cursor"
              maxLength={60}
              className="bg-transparent border-0 border-b border-ink/30 focus:border-ink outline-none py-2 text-ink placeholder:text-ink-faint transition-colors"
              style={{ fontSize: "1rem" }}
              autoFocus
            />
          </label>
          <div className="flex items-center gap-6">
            <button
              type="submit"
              disabled={pending}
              className="group inline-flex items-center gap-2 font-mono disabled:opacity-50"
              style={{ fontSize: "11px", letterSpacing: "0.22em" }}
            >
              <span className="relative whitespace-nowrap text-ink">
                {pending ? "creating…" : "create key"}
                <span
                  aria-hidden
                  className="absolute left-0 right-0 -bottom-1 transition-all duration-300 group-hover:-bottom-1.5"
                  style={{ background: "var(--rust)", height: 1 }}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="font-mono text-ink-faint hover:text-ink transition-colors"
              style={{ fontSize: "11px", letterSpacing: "0.22em" }}
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      {keys.length === 0 ? (
        <div
          className="border border-dashed border-ink/15 px-8 py-12 text-center"
          style={{ background: "rgba(10,10,10,0.01)" }}
        >
          <p
            className="text-ink-soft mb-2"
            style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
          >
            {canCreateKeys ? "No keys yet." : "Subscribe via Stripe to create API keys."}
          </p>
          <p
            className="font-mono text-ink-faint"
            style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
          >
            {canCreateKeys
              ? "/ GENERATE ONE TO START ROUTING THROUGH DUEL"
              : "/ SUBSCRIBE VIA STRIPE FIRST"}
          </p>
        </div>
      ) : (
        <ul className="border border-ink/10 divide-y divide-ink/10">
          {keys.map((k) => (
            <li
              key={k.id}
              className="px-6 py-5 flex items-center justify-between gap-6"
            >
              <div className="min-w-0 flex-1">
                <p
                  className="font-mono text-ink truncate"
                  style={{ fontSize: "0.875rem", letterSpacing: "-0.005em" }}
                >
                  duel_{k.prefix}_•••••••••••••••••••••••••••••••••
                </p>
                <p
                  className="font-mono text-ink-faint mt-1"
                  style={{ fontSize: "10px", letterSpacing: "0.22em" }}
                >
                  {(k.name || "UNNAMED").toUpperCase()} ·
                  {" "}CREATED {formatRelative(k.createdAt)} ·
                  {" "}{k.lastUsedAt ? `LAST USED ${formatRelative(k.lastUsedAt)}` : "NEVER USED"}
                  {k.revokedAt && " · REVOKED"}
                </p>
              </div>
              {!k.revokedAt && (
                <button
                  type="button"
                  onClick={() => onRevoke(k.id)}
                  disabled={pending}
                  className="font-mono text-ink-faint hover:text-rust transition-colors disabled:opacity-50"
                  style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
                >
                  REVOKE
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────── fresh key banner */

function FreshKeyBanner({
  fresh,
  onDismiss,
}: {
  fresh: FreshKey;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(fresh.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="border border-rust px-6 py-5 mb-6"
      style={{ background: "rgba(200,74,26,0.04)" }}
    >
      <div className="flex items-start justify-between gap-6 mb-3">
        <p
          className="font-mono text-rust"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / NEW KEY — SAVE IT NOW, IT WON'T BE SHOWN AGAIN
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="font-mono text-ink-faint hover:text-ink transition-colors"
          style={{ fontSize: "10px", letterSpacing: "0.28em" }}
        >
          DISMISS
        </button>
      </div>
      <div className="flex items-center gap-4">
        <code
          className="flex-1 font-mono text-ink break-all"
          style={{ fontSize: "0.875rem", letterSpacing: "-0.005em" }}
        >
          {fresh.plaintext}
        </code>
        <button
          type="button"
          onClick={copy}
          className="flex-none font-mono text-ink hover:text-rust transition-colors"
          style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
        >
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── helpers */

function formatRelative(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}S AGO`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}D AGO`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}MO AGO`;
  const years = Math.floor(months / 12);
  return `${years}Y AGO`;
}
