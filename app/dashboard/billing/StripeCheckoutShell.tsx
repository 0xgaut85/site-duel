"use client";

import Image from "next/image";
import { useState } from "react";
import { useCryptoCheckoutPayment } from "@/hooks/useCryptoCheckoutPayment";

export type CheckoutTab = "card" | "crypto";

const STRIPE = {
  bg: "#f6f9fc",
  card: "#ffffff",
  border: "#e6ebf1",
  text: "#30313d",
  muted: "#697386",
  accent: "#635bff",
  error: "#df1b41",
  errorBg: "#fef7f7",
};

interface StripeCheckoutShellProps {
  tierLabel: string;
  tab: CheckoutTab;
  onTabChange: (tab: CheckoutTab) => void;
  onBack: () => void;
  children: React.ReactNode;
}

export function StripeCheckoutShell({
  tierLabel,
  tab,
  onTabChange,
  onBack,
  children,
}: StripeCheckoutShellProps) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: STRIPE.bg,
        border: `1px solid ${STRIPE.border}`,
        boxShadow: "0 4px 24px rgba(50,50,93,0.08), 0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ background: STRIPE.card, borderColor: STRIPE.border }}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/stripelogo.jpeg"
            alt=""
            width={28}
            height={28}
            className="rounded-sm"
          />
          <Image
            src="/stripetext.png"
            alt="Stripe"
            width={52}
            height={22}
            className="h-[22px] w-auto"
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: "12px",
              color: STRIPE.muted,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Secure checkout
          </span>
          <button
            type="button"
            onClick={onBack}
            style={{
              fontSize: "12px",
              color: STRIPE.muted,
              fontFamily: "system-ui, sans-serif",
            }}
            className="hover:opacity-70 transition-opacity"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-2">
        <p
          style={{
            fontSize: "13px",
            color: STRIPE.muted,
            fontFamily: "system-ui, sans-serif",
            marginBottom: "12px",
          }}
        >
          {tierLabel} subscription
        </p>

        <div
          className="flex rounded-md overflow-hidden mb-4"
          style={{ border: `1px solid ${STRIPE.border}` }}
        >
          <TabButton
            active={tab === "card"}
            onClick={() => onTabChange("card")}
            label="Card"
          />
          <TabButton
            active={tab === "crypto"}
            onClick={() => onTabChange("crypto")}
            label="Crypto"
            sublabel="USDC"
          />
        </div>
      </div>

      <div
        className="mx-5 mb-5 rounded-md p-5"
        style={{ background: STRIPE.card, border: `1px solid ${STRIPE.border}` }}
      >
        {children}
      </div>

      <div
        className="px-5 py-3 text-center border-t"
        style={{ borderColor: STRIPE.border }}
      >
        <p
          style={{
            fontSize: "11px",
            color: STRIPE.muted,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Powered by{" "}
          <span style={{ fontWeight: 500, color: STRIPE.text }}>Stripe</span>
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2.5 px-3 transition-colors"
      style={{
        background: active ? STRIPE.card : "#fafbfc",
        borderBottom: active ? `2px solid ${STRIPE.accent}` : "2px solid transparent",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: active ? 500 : 400,
          color: active ? STRIPE.text : STRIPE.muted,
        }}
      >
        {label}
      </span>
      {sublabel && (
        <span
          style={{
            display: "block",
            fontSize: "10px",
            color: STRIPE.muted,
            marginTop: "1px",
          }}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
}

export function StripeCardForm({
  onSwitchToCrypto,
}: {
  onSwitchToCrypto: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2400));
    setProcessing(false);
    setError("Your card has been declined.");
  };

  const inputClass =
    "w-full rounded-md outline-none transition-shadow focus:ring-2 focus:ring-[#635bff]/30";

  return (
    <form onSubmit={handleSubmit}>
      <label className="block mb-4">
        <span
          className="block mb-1.5"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Card information
        </span>
        <div className="relative">
          <input
            type="text"
            placeholder="1234 1234 1234 1234"
            autoComplete="cc-number"
            className={inputClass}
            style={{
              padding: "12px 40px 12px 12px",
              fontSize: "15px",
              border: `1px solid ${STRIPE.border}`,
              color: STRIPE.text,
              fontFamily: "system-ui, sans-serif",
            }}
          />
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1"
            aria-hidden
          >
            <CardBrandDot color="#1a1f71" />
            <CardBrandDot color="#eb001b" />
            <CardBrandDot color="#006fcf" />
          </div>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="block">
          <input
            type="text"
            placeholder="MM / YY"
            autoComplete="cc-exp"
            className={inputClass}
            style={{
              padding: "12px",
              fontSize: "15px",
              border: `1px solid ${STRIPE.border}`,
              color: STRIPE.text,
              fontFamily: "system-ui, sans-serif",
            }}
          />
        </label>
        <label className="block">
          <input
            type="text"
            placeholder="CVC"
            autoComplete="cc-csc"
            className={inputClass}
            style={{
              padding: "12px",
              fontSize: "15px",
              border: `1px solid ${STRIPE.border}`,
              color: STRIPE.text,
              fontFamily: "system-ui, sans-serif",
            }}
          />
        </label>
      </div>

      <label className="block mb-4">
        <span
          className="block mb-1.5"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Country or region
        </span>
        <select
          className={inputClass}
          defaultValue="US"
          style={{
            padding: "12px",
            fontSize: "15px",
            border: `1px solid ${STRIPE.border}`,
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
            background: STRIPE.card,
          }}
        >
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="CA">Canada</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
        </select>
      </label>

      <label className="block mb-6">
        <span
          className="block mb-1.5"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          ZIP
        </span>
        <input
          type="text"
          placeholder="12345"
          autoComplete="postal-code"
          className={inputClass}
          style={{
            padding: "12px",
            fontSize: "15px",
            border: `1px solid ${STRIPE.border}`,
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
          }}
        />
      </label>

      {error && (
        <div
          className="mb-4 rounded-md px-3 py-3"
          style={{ background: STRIPE.errorBg, border: `1px solid #f5c6cb` }}
          role="alert"
        >
          <p
            style={{
              fontSize: "13px",
              color: STRIPE.error,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
          <p
            className="mt-2"
            style={{
              fontSize: "13px",
              color: STRIPE.muted,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.5,
            }}
          >
            Use Stripe Crypto instead.{" "}
            <button
              type="button"
              onClick={onSwitchToCrypto}
              style={{
                color: STRIPE.accent,
                fontWeight: 500,
                textDecoration: "underline",
              }}
            >
              Switch to Stripe Crypto
            </button>
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={processing}
        className="w-full rounded-md transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{
          background: STRIPE.accent,
          color: "#ffffff",
          padding: "14px 16px",
          fontSize: "15px",
          fontWeight: 500,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {processing ? "Processing payment…" : "Pay"}
      </button>
    </form>
  );
}

function CardBrandDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block rounded-sm"
      style={{ width: 22, height: 14, background: color, opacity: 0.85 }}
    />
  );
}

type Chain = "base" | "polygon";

interface CryptoIntent {
  intentId: string;
  amountUsdc: string;
  amountMicroUsdc: number;
  treasuryAddress: string;
  chain: Chain;
  expiresAt: string;
}

export function StripeCryptoPanel({
  chain,
  onChainChange,
  intent,
  intentStatus,
  loading,
  apiError,
  onRetry,
  onConfirmed,
}: {
  chain: Chain;
  onChainChange: (chain: Chain) => void;
  intent: CryptoIntent | null;
  intentStatus: "pending" | "confirmed" | "expired" | null;
  loading: boolean;
  apiError: string | null;
  onRetry: () => void;
  onConfirmed: (explorerUrl: string | null) => void;
}) {
  const payment = useCryptoCheckoutPayment({
    intent:
      intent && intentStatus === "pending"
        ? {
            intentId: intent.intentId,
            amountUsdc: intent.amountUsdc,
            amountMicroUsdc: intent.amountMicroUsdc,
            treasuryAddress: intent.treasuryAddress,
            chain: intent.chain,
          }
        : null,
    chain,
    onConfirmed,
  });

  const expiresInMs =
    intent?.expiresAt != null
      ? new Date(intent.expiresAt).getTime() - Date.now()
      : null;
  const expiresInSec =
    expiresInMs != null ? Math.max(0, Math.floor(expiresInMs / 1000)) : null;

  const payLabel =
    intent != null ? `Pay ${intent.amountUsdc} USDC` : "Pay with USDC";

  const isBusy =
    payment.phase === "paying" ||
    payment.phase === "confirming" ||
    payment.phase === "processing" ||
    payment.isConnecting ||
    payment.isSwitching ||
    payment.isWaitingReceipt;

  return (
    <div>
      <p
        className="mb-5"
        style={{
          fontSize: "14px",
          color: STRIPE.muted,
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.55,
        }}
      >
        Pay with USDC stablecoin through Stripe Crypto. Connect your wallet to
        complete payment.
      </p>

      <p
        className="mb-2"
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: STRIPE.text,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Network
      </p>
      <div
        className="flex rounded-md overflow-hidden mb-5"
        style={{ border: `1px solid ${STRIPE.border}` }}
      >
        {(["base", "polygon"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChainChange(c)}
            disabled={loading || isBusy}
            className="flex-1 py-2 px-3 transition-colors disabled:opacity-50"
            style={{
              background: chain === c ? STRIPE.card : "#fafbfc",
              borderBottom:
                chain === c
                  ? `2px solid ${STRIPE.accent}`
                  : "2px solid transparent",
              fontSize: "13px",
              fontWeight: chain === c ? 500 : 400,
              color: chain === c ? STRIPE.text : STRIPE.muted,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {c === "base" ? "Base network" : "Polygon network"}
          </button>
        ))}
      </div>

      {(apiError || payment.error) && (
        <p
          className="mb-4 rounded-md px-3 py-2"
          style={{
            fontSize: "13px",
            color: STRIPE.error,
            background: STRIPE.errorBg,
            fontFamily: "system-ui, sans-serif",
          }}
          role="alert"
        >
          {apiError ?? payment.error}
        </p>
      )}

      {loading && !intent && (
        <p
          style={{
            fontSize: "13px",
            color: STRIPE.muted,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Preparing your Stripe Crypto payment…
        </p>
      )}

      {intent && intentStatus === "expired" && (
        <div className="mb-4">
          <p
            className="mb-3"
            style={{
              fontSize: "14px",
              color: STRIPE.muted,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            This payment session expired. Start a new one to continue.
          </p>
          <button
            type="button"
            onClick={onRetry}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: STRIPE.accent,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {intent && intentStatus === "pending" && (
        <div
          className="space-y-4 rounded-md p-4"
          style={{ border: `1px solid ${STRIPE.border}`, background: "#fafbfc" }}
        >
          <div>
            <p
              className="mb-1"
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: STRIPE.muted,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Amount due
            </p>
            <p
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: STRIPE.text,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {intent.amountUsdc} USDC
            </p>
            <p
              className="mt-2"
              style={{
                fontSize: "12px",
                color: STRIPE.muted,
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.45,
              }}
            >
              Send exactly this amount on {chain === "base" ? "Base" : "Polygon"}.
              Includes a unique verification suffix.
            </p>
          </div>

          {payment.isConnected && payment.truncatedAddress && (
            <div>
              <p
                className="mb-1"
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: STRIPE.muted,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Connected wallet
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: STRIPE.text,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {payment.truncatedAddress}
                {payment.usdcBalanceLabel
                  ? ` · ${payment.usdcBalanceLabel}`
                  : ""}
              </p>
            </div>
          )}

          <p
            style={{
              fontSize: "12px",
              color: STRIPE.muted,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {expiresInSec != null && expiresInSec > 0
              ? `Session expires in ${Math.floor(expiresInSec / 60)}m ${expiresInSec % 60}s`
              : "Session expired"}
          </p>

          {!payment.isConnected ? (
            <button
              type="button"
              onClick={() => void payment.connectWallet()}
              disabled={payment.isConnecting}
              className="w-full rounded-md py-2.5 transition-opacity disabled:opacity-60"
              style={{
                background: STRIPE.accent,
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {payment.isConnecting ? "Connecting…" : "Connect wallet"}
            </button>
          ) : payment.phase === "wrong_chain" ? (
            <button
              type="button"
              onClick={() => void payment.switchToChain()}
              disabled={payment.isSwitching}
              className="w-full rounded-md py-2.5 transition-opacity disabled:opacity-60"
              style={{
                background: STRIPE.accent,
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {payment.isSwitching
                ? "Switching network…"
                : `Switch to ${chain === "base" ? "Base" : "Polygon"}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void payment.payWithUsdc()}
              disabled={isBusy || !payment.balanceReady}
              className="w-full rounded-md py-2.5 transition-opacity disabled:opacity-60"
              style={{
                background: STRIPE.accent,
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {payment.phase === "paying"
                ? "Confirm in your wallet…"
                : payment.phase === "confirming" || payment.isWaitingReceipt
                  ? "Waiting for transaction…"
                  : payment.phase === "processing"
                    ? "Processing payment…"
                    : payLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function StripeSuccessPanel({
  tierLabel,
  explorerUrl,
}: {
  tierLabel: string;
  explorerUrl: string | null;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: STRIPE.bg,
        border: `1px solid ${STRIPE.border}`,
        boxShadow: "0 4px 24px rgba(50,50,93,0.08)",
      }}
    >
      <div className="px-6 py-8" style={{ background: STRIPE.card }}>
        <div className="flex items-center gap-3 mb-4">
          <Image
            src="/stripelogo.jpeg"
            alt=""
            width={24}
            height={24}
            className="rounded-sm"
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#0d9488",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Payment successful
          </span>
        </div>
        <p
          className="mb-4"
          style={{
            fontSize: "15px",
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.55,
          }}
        >
          Your {tierLabel} subscription is active for 30 days. A confirmation
          email is on its way. You can now create API keys in Settings.
        </p>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-4"
            style={{
              fontSize: "13px",
              color: STRIPE.accent,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            View payment details →
          </a>
        )}
        <a
          href="/dashboard/settings"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: STRIPE.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Create API keys →
        </a>
      </div>
    </div>
  );
}
