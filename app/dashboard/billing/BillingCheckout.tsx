"use client";

import { useCallback, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { TierConfig } from "@/lib/billing/tiers";
import { isPaidSubscription } from "@/lib/billing/tiers";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface BillingCheckoutProps {
  tiers: TierConfig[];
  currentTier: string;
  stripeConfigured: boolean;
}

export function BillingCheckout({
  tiers,
  currentTier,
  stripeConfigured,
}: BillingCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<
    TierConfig["id"] | null
  >(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const startCheckout = useCallback(async (tier: TierConfig["id"]) => {
    setSelectedTier(tier);
    setApiError(null);
    setLoading(true);
    setClientSecret(null);

    try {
      const res = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        clientSecret?: string;
        message?: string;
      };

      if (!res.ok || !data.clientSecret) {
        setApiError(data.message ?? "Could not start checkout.");
        return;
      }

      setClientSecret(data.clientSecret);
    } catch {
      setApiError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  if (!stripeConfigured || !stripePromise) {
    return (
      <p className="text-ink-soft" style={{ fontSize: "0.975rem", lineHeight: 1.55 }}>
        Billing is not configured on this server yet. Add Stripe keys to enable
        checkout.
      </p>
    );
  }

  if (clientSecret && selectedTier) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm
          tierLabel={
            tiers.find((t) => t.id === selectedTier)?.label ?? selectedTier
          }
          onBack={() => {
            setClientSecret(null);
            setSelectedTier(null);
            setApiError(null);
          }}
        />
      </Elements>
    );
  }

  return (
    <div>
      <p
        className="text-ink-soft max-w-[58ch] mb-8"
        style={{ fontSize: "1rem", lineHeight: 1.55 }}
      >
        {isPaidSubscription(currentTier)
          ? "Change plan or update your payment method by selecting a tier below."
          : "Launch pricing below. Checkout opens at public launch (card and USDC via Stripe)."}
      </p>

      {apiError && (
        <p
          className="mb-6 font-mono text-rust"
          style={{ fontSize: "11px", letterSpacing: "0.12em" }}
          role="alert"
        >
          {apiError}
        </p>
      )}

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
                disabled={loading || isCurrent}
                onClick={() => startCheckout(tier.id)}
                className="font-mono text-left text-ink hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontSize: "11px", letterSpacing: "0.22em" }}
              >
                {isCurrent
                  ? "CURRENT PLAN"
                  : loading && selectedTier === tier.id
                    ? "PREPARING…"
                    : isPaidSubscription(currentTier)
                      ? "SWITCH PLAN"
                      : "SUBSCRIBE"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutForm({
  tierLabel,
  onBack,
}: {
  tierLabel: string;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/billing?success=1`,
      },
      redirect: "if_required",
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message ?? "Payment failed.");
      return;
    }

    setSucceeded(true);
  };

  if (succeeded) {
    return (
      <div className="border border-ink/10 px-8 py-10">
        <p
          className="font-mono text-rust mb-3"
          style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
        >
          / PAYMENT RECEIVED
        </p>
        <p
          className="text-ink-soft mb-6 max-w-[50ch]"
          style={{ fontSize: "0.975rem", lineHeight: 1.55 }}
        >
          Your {tierLabel} subscription is processing. It may take a moment for
          your tier to update after Stripe confirms payment.
        </p>
        <a
          href="/dashboard"
          className="font-mono text-ink hover:opacity-70 transition-opacity"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          BACK TO OVERVIEW
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-ink/10 px-8 py-10">
      <p
        className="font-mono text-ink-faint mb-6"
        style={{ fontSize: "10.5px", letterSpacing: "0.28em" }}
      >
        / CHECKOUT · {tierLabel.toUpperCase()}
      </p>

      <PaymentElement
        options={{
          paymentMethodOrder: ["card", "crypto"],
        }}
      />

      {errorMessage && (
        <p
          className="mt-6 font-mono text-rust"
          style={{ fontSize: "11px", letterSpacing: "0.12em", lineHeight: 1.5 }}
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="font-mono text-ink hover:opacity-70 transition-opacity disabled:opacity-40"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          {submitting ? "PROCESSING…" : "PAY NOW"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="font-mono text-ink-faint hover:text-ink transition-colors"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          CHANGE PLAN
        </button>
      </div>
    </form>
  );
}
