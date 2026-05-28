import type { PaidTier } from "@/lib/billing/tiers";

/** Tier base prices in USDC micro-units (6 decimals). */
const TIER_BASE_MICRO: Record<PaidTier, number> = {
  indie: 19_000_000,
  pro: 49_000_000,
  team: 199_000_000,
};

export function getTierBaseMicroUsdc(tier: PaidTier): number {
  return TIER_BASE_MICRO[tier];
}

/** Adds a unique 1–999999 micro suffix so each intent has a distinct amount. */
export function buildUniqueAmountMicroUsdc(
  tier: PaidTier,
  suffix: number,
): number {
  const normalized = ((suffix - 1) % 999_999) + 1;
  return TIER_BASE_MICRO[tier] + normalized;
}

export function formatMicroUsdc(amountMicro: number): string {
  const whole = Math.floor(amountMicro / 1_000_000);
  const frac = (amountMicro % 1_000_000).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}
