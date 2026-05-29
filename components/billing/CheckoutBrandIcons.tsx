"use client";

import { NetworkBase, NetworkPolygon } from "@web3icons/react";
import { siMastercard, siVisa } from "simple-icons";
import type { CryptoChain } from "@/lib/billing/crypto/config";

export function ChainNetworkIcon({
  chain,
  size = 18,
}: {
  chain: CryptoChain;
  size?: number;
}) {
  const props = { variant: "branded" as const, size, "aria-hidden": true };
  return chain === "base" ? (
    <NetworkBase {...props} />
  ) : (
    <NetworkPolygon {...props} />
  );
}

function PaymentCardIcon({
  icon,
  width = 28,
  height = 18,
}: {
  icon: typeof siVisa;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      aria-label={icon.title}
      className="shrink-0"
    >
      <path fill={`#${icon.hex}`} d={icon.path} />
    </svg>
  );
}

export function VisaIcon(props: Omit<Parameters<typeof PaymentCardIcon>[0], "icon">) {
  return <PaymentCardIcon icon={siVisa} {...props} />;
}

export function MastercardIcon(
  props: Omit<Parameters<typeof PaymentCardIcon>[0], "icon">,
) {
  return <PaymentCardIcon icon={siMastercard} {...props} />;
}

export function CardBrandMarks() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      <VisaIcon width={32} height={20} />
      <MastercardIcon width={26} height={20} />
    </div>
  );
}
