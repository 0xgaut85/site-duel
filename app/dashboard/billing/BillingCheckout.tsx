"use client";

import { useCallback, useEffect, useState } from "react";
import type { TierConfig } from "@/lib/billing/tiers";
import { isPaidSubscription } from "@/lib/billing/tiers";

type Chain = "base" | "polygon";
type CheckoutTab = "card" | "usdc";

interface BillingCheckoutProps {
  tiers: TierConfig[];
  currentTier: string;
  cryptoConfigured: boolean;
}

interface CryptoIntent {
  intentId: string;
  amountUsdc: string;
  treasuryAddress: string;
  chain: Chain;
  tier: TierConfig["id"];
  expiresAt: string;
}

export function BillingCheckout({
  tiers,
  currentTier,
  cryptoConfigured,
}: BillingCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<TierConfig["id"] | null>(
    null,
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tab, setTab] = useState<CheckoutTab>("usdc");
  const [chain, setChain] = useState<Chain>("base");
  const [intent, setIntent] = useState<CryptoIntent | null>(null);
  const [intentStatus, setIntentStatus] = useState<
    "pending" | "confirmed" | "expired" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const startCheckout = (tier: TierConfig["id"]) => {
    setSelectedTier(tier);
    setCheckoutOpen(true);
    setTab("usdc");
    setIntent(null);
    setIntentStatus(null);
    setApiError(null);
    setCardError(null);
    setExplorerUrl(null);
  };

  const createIntent = useCallback(async () => {
    if (!selectedTier || !cryptoConfigured) return;

    setLoading(true);
    setApiError(null);
    setIntent(null);
    setIntentStatus(null);

    try {
      const res = await fetch("/api/billing/crypto-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier, chain }),
      });
      const data = (await res.json()) as CryptoIntent & {
        ok?: boolean;
        message?: string;
      };

      if (!res.ok || !data.intentId) {
        setApiError(data.message ?? "Could not start USDC checkout.");
        return;
      }

      setIntent(data);
      setIntentStatus("pending");
    } catch {
      setApiError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedTier, chain, cryptoConfigured]);

  useEffect(() => {
    if (tab !== "usdc" || !checkoutOpen || !selectedTier || intent) return;
    void createIntent();
  }, [tab, checkoutOpen, selectedTier, chain, intent, createIntent]);

  useEffect(() => {
    if (!intent || intentStatus !== "pending") return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/billing/crypto-intent/${intent.intentId}`);
        const data = (await res.json()) as {
          ok?: boolean;
          status?: "pending" | "confirmed" | "expired";
          explorerUrl?: string;
        };
        if (cancelled || !data.ok || !data.status) return;

        setIntentStatus(data.status);
        if (data.explorerUrl) setExplorerUrl(data.explorerUrl);
      } catch {
        /* keep polling */
      }
    };

    void poll();
    const id = window.setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intent, intentStatus]);

  if (!cryptoConfigured) {
    return (
      <p
        className="text-ink-soft"
        style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
      >
        USDC billing is not configured yet. Set{" "}
        <code className="font-mono text-ink">CRYPTO_TREASURY_ADDRESS</code> and
        RPC URLs on the server.
      </p>
    );
  }

  if (checkoutOpen && selectedTier) {
    const tierLabel =
      tiers.find((t) => t.id === selectedTier)?.label ?? selectedTier;

    if (intentStatus === "confirmed") {
      return (
        <div className="border border-ink/10 px-8 py-10">
          <p
            className="font-mono text-rust mb-3"
            style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
          >
            / PAYMENT CONFIRMED
          </p>
          <p
            className="text-ink-soft mb-6 max-w-[50ch]"
            style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
          >
            Your {tierLabel} subscription is active for 30 days. A confirmation
            email is on its way. You can now create API keys in Settings.
          </p>
          {explorerUrl && (
            <p className="mb-6">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-rust hover:opacity-70 transition-opacity"
                style={{ fontSize: "11px", letterSpacing: "0.18em" }}
              >
                VIEW TRANSACTION →
              </a>
            </p>
          )}
          <a
            href="/dashboard/settings"
            className="font-mono text-ink hover:opacity-70 transition-opacity"
            style={{ fontSize: "11px", letterSpacing: "0.22em" }}
          >
            CREATE API KEYS →
          </a>
        </div>
      );
    }

    return (
      <div className="border border-ink/10 px-8 py-10">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <p
            className="font-mono text-ink-faint"
            style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
          >
            / CHECKOUT · {tierLabel.toUpperCase()}
          </p>
          <button
            type="button"
            onClick={() => {
              setCheckoutOpen(false);
              setSelectedTier(null);
              setIntent(null);
              setIntentStatus(null);
            }}
            className="font-mono text-ink-faint hover:text-ink transition-colors ml-auto"
            style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
          >
            CHANGE PLAN
          </button>
        </div>

        <div className="flex gap-px mb-8 border border-ink/10 w-fit">
          {(["card", "usdc"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 font-mono transition-colors ${
                tab === t
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink-faint hover:text-ink"
              }`}
              style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
            >
              {t === "card" ? "CARD" : "USDC"}
            </button>
          ))}
        </div>

        {tab === "card" ? (
          <CardCheckoutForm onError={setCardError} error={cardError} />
        ) : (
          <UsdcCheckoutPanel
            chain={chain}
            onChainChange={(c) => {
              setChain(c);
              setIntent(null);
              setIntentStatus(null);
              setApiError(null);
            }}
            intent={intent}
            intentStatus={intentStatus}
            loading={loading}
            apiError={apiError}
            onRetry={() => {
              setIntent(null);
              setIntentStatus(null);
              void createIntent();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <p
        className="text-ink-soft max-w-[58ch] mb-8"
        style={{ fontSize: "1rem", lineHeight: 1.55 }}
      >
        {isPaidSubscription(currentTier)
          ? "Renew or change plan by paying with USDC on Base or Polygon. Each payment activates 30 days."
          : "Pay with USDC on Base or Polygon. Card checkout is not available — send the exact amount shown and we detect your transfer automatically."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ink/10 border border-ink/10">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.id;
          return (
            <div key={tier.id} className="bg-paper p-8 flex flex-col">
              <p
                className="font-mono text-ink-faint mb-3"
                style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
              >
                / {tier.label.toUpperCase()}
              </p>
              <p
                className="font-display font-medium text-ink mb-2"
                style={{
                  fontSize: "clamp(1.5rem, 2.4vw, 2rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                {tier.priceDisplay}
              </p>
              <p
                className="font-mono text-ink-faint mb-6 flex-1"
                style={{ fontSize: "10px", letterSpacing: "0.18em" }}
              >
                {tier.quotaLabel.toUpperCase()}
              </p>
              <button
                type="button"
                disabled={isCurrent}
                onClick={() => startCheckout(tier.id)}
                className="font-mono text-left text-ink hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontSize: "11px", letterSpacing: "0.22em" }}
              >
                {isCurrent ? "CURRENT PLAN" : "SUBSCRIBE"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardCheckoutForm({
  onError,
  error,
}: {
  onError: (msg: string | null) => void;
  error: string | null;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onError(
      "Card payments are not available. Pay with USDC on Base or Polygon.",
    );
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="space-y-4 mb-6">
        <label className="block">
          <span
            className="font-mono text-ink-faint block mb-2"
            style={{ fontSize: "10px", letterSpacing: "0.22em" }}
          >
            CARD NUMBER
          </span>
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            className="w-full bg-paper border border-ink/20 px-4 py-3 text-ink outline-none focus:border-ink/50"
            style={{ fontSize: "0.95rem" }}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span
              className="font-mono text-ink-faint block mb-2"
              style={{ fontSize: "10px", letterSpacing: "0.22em" }}
            >
              EXPIRY
            </span>
            <input
              type="text"
              placeholder="MM / YY"
              className="w-full bg-paper border border-ink/20 px-4 py-3 text-ink outline-none focus:border-ink/50"
            />
          </label>
          <label className="block">
            <span
              className="font-mono text-ink-faint block mb-2"
              style={{ fontSize: "10px", letterSpacing: "0.22em" }}
            >
              CVC
            </span>
            <input
              type="text"
              placeholder="123"
              className="w-full bg-paper border border-ink/20 px-4 py-3 text-ink outline-none focus:border-ink/50"
            />
          </label>
        </div>
      </div>

      {error && (
        <p
          className="mb-4 font-mono text-rust"
          style={{ fontSize: "11px", letterSpacing: "0.12em", lineHeight: 1.5 }}
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        className="font-mono text-ink hover:opacity-70 transition-opacity"
        style={{ fontSize: "11px", letterSpacing: "0.22em" }}
      >
        PAY NOW
      </button>
    </form>
  );
}

function UsdcCheckoutPanel({
  chain,
  onChainChange,
  intent,
  intentStatus,
  loading,
  apiError,
  onRetry,
}: {
  chain: Chain;
  onChainChange: (chain: Chain) => void;
  intent: CryptoIntent | null;
  intentStatus: "pending" | "confirmed" | "expired" | null;
  loading: boolean;
  apiError: string | null;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState<"amount" | "address" | null>(null);

  const copy = async (text: string, which: "amount" | "address") => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const expiresInMs =
    intent?.expiresAt != null
      ? new Date(intent.expiresAt).getTime() - Date.now()
      : null;
  const expiresInSec =
    expiresInMs != null ? Math.max(0, Math.floor(expiresInMs / 1000)) : null;

  return (
    <div className="max-w-lg">
      <p
        className="text-ink-soft mb-6 max-w-[50ch]"
        style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
      >
        Send the exact USDC amount to our treasury on your chosen chain. We
        detect the transfer automatically — no tx hash needed.
      </p>

      <div className="flex gap-px mb-6 border border-ink/10 w-fit">
        {(["base", "polygon"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChainChange(c)}
            disabled={loading}
            className={`px-4 py-2 font-mono transition-colors disabled:opacity-50 ${
              chain === c
                ? "bg-ink text-paper"
                : "bg-paper text-ink-faint hover:text-ink"
            }`}
            style={{ fontSize: "10px", letterSpacing: "0.2em" }}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      {apiError && (
        <p
          className="mb-4 font-mono text-rust"
          style={{ fontSize: "11px", letterSpacing: "0.12em" }}
          role="alert"
        >
          {apiError}
        </p>
      )}

      {loading && !intent && (
        <p
          className="font-mono text-ink-faint"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          PREPARING PAYMENT…
        </p>
      )}

      {intent && intentStatus === "expired" && (
        <div className="mb-6">
          <p className="text-ink-soft mb-4" style={{ fontSize: "0.975rem" }}>
            This payment window expired. Start a new intent to get a fresh
            amount.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="font-mono text-ink hover:opacity-70"
            style={{ fontSize: "11px", letterSpacing: "0.22em" }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {intent && intentStatus === "pending" && (
        <div className="space-y-5 border border-ink/10 p-6">
          <CopyRow
            label="AMOUNT (USDC)"
            value={`${intent.amountUsdc} USDC`}
            onCopy={() => copy(intent.amountUsdc, "amount")}
            copied={copied === "amount"}
          />
          <CopyRow
            label="TREASURY ADDRESS"
            value={intent.treasuryAddress}
            onCopy={() => copy(intent.treasuryAddress, "address")}
            copied={copied === "address"}
          />
          <p
            className="font-mono text-ink-faint"
            style={{ fontSize: "10px", letterSpacing: "0.18em" }}
          >
            CHAIN: {intent.chain.toUpperCase()} ·{" "}
            {expiresInSec != null && expiresInSec > 0
              ? `EXPIRES IN ${Math.floor(expiresInSec / 60)}M ${expiresInSec % 60}S`
              : "EXPIRED"}
          </p>
          <p
            className="font-mono text-ink-faint animate-pulse"
            style={{ fontSize: "10.5px", letterSpacing: "0.22em" }}
          >
            / WAITING FOR YOUR TRANSFER…
          </p>
        </div>
      )}
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <p
        className="font-mono text-ink-faint mb-2"
        style={{ fontSize: "10px", letterSpacing: "0.22em" }}
      >
        {label}
      </p>
      <div className="flex items-start gap-4">
        <code
          className="flex-1 font-mono text-ink break-all"
          style={{ fontSize: "0.875rem" }}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="flex-none font-mono text-ink-faint hover:text-ink transition-colors"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
    </div>
  );
}
