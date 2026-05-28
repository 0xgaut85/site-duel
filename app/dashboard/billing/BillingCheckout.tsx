"use client";

import { useCallback, useEffect, useState } from "react";
import type { TierConfig } from "@/lib/billing/tiers";
import { isPaidSubscription } from "@/lib/billing/tiers";
import {
  StripeCardForm,
  StripeCheckoutShell,
  StripeCryptoPanel,
  StripeSuccessPanel,
  type CheckoutTab,
} from "./StripeCheckoutShell";

type Chain = "base" | "polygon";

interface BillingCheckoutProps {
  tiers: TierConfig[];
  currentTier: string;
  cryptoConfigured: boolean;
}

interface CryptoIntent {
  intentId: string;
  amountUsdc: string;
  amountMicroUsdc: number;
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
  const [tab, setTab] = useState<CheckoutTab>("card");
  const [chain, setChain] = useState<Chain>("base");
  const [intent, setIntent] = useState<CryptoIntent | null>(null);
  const [intentStatus, setIntentStatus] = useState<
    "pending" | "confirmed" | "expired" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const startCheckout = (tier: TierConfig["id"]) => {
    setSelectedTier(tier);
    setCheckoutOpen(true);
    setTab("card");
    setIntent(null);
    setIntentStatus(null);
    setApiError(null);
    setExplorerUrl(null);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setSelectedTier(null);
    setIntent(null);
    setIntentStatus(null);
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
        setApiError(data.message ?? "Could not start checkout. Try again.");
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
    if (tab !== "crypto" || !checkoutOpen || !selectedTier || intent) return;
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
        Checkout is not available yet. Please try again later.
      </p>
    );
  }

  if (checkoutOpen && selectedTier) {
    const tierLabel =
      tiers.find((t) => t.id === selectedTier)?.label ?? selectedTier;

    if (intentStatus === "confirmed") {
      return (
        <StripeSuccessPanel tierLabel={tierLabel} explorerUrl={explorerUrl} />
      );
    }

    return (
      <StripeCheckoutShell
        tierLabel={tierLabel}
        tab={tab}
        onTabChange={setTab}
        onBack={closeCheckout}
      >
        {tab === "card" ? (
          <StripeCardForm onSwitchToCrypto={() => setTab("crypto")} />
        ) : (
          <StripeCryptoPanel
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
            onConfirmed={(url) => {
              setIntentStatus("confirmed");
              if (url) setExplorerUrl(url);
            }}
          />
        )}
      </StripeCheckoutShell>
    );
  }

  return (
    <div>
      <p
        className="text-ink-soft max-w-[58ch] mb-8"
        style={{ fontSize: "1rem", lineHeight: 1.55 }}
      >
        {isPaidSubscription(currentTier)
          ? "Renew or change plan through Stripe. Each payment activates 30 days."
          : "Checkout with Stripe. Pay by card or Stripe Crypto (USDC)."}
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
