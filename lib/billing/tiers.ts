export type PaidTier = "indie" | "pro" | "team";

export interface TierConfig {
  id: PaidTier;
  label: string;
  priceDisplay: string;
  quota: number;
  quotaLabel: string;
  priceEnvKey: string;
}

export const PAID_TIERS: TierConfig[] = [
  {
    id: "indie",
    label: "Indie",
    priceDisplay: "$19/mo",
    quota: 10_000,
    quotaLabel: "10,000 calls / month",
    priceEnvKey: "STRIPE_PRICE_INDIE",
  },
  {
    id: "pro",
    label: "Pro",
    priceDisplay: "$49/mo",
    quota: 50_000,
    quotaLabel: "50,000 calls / month",
    priceEnvKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "team",
    label: "Team",
    priceDisplay: "$199/mo",
    quota: 1_000_000,
    quotaLabel: "1M calls / month (fair use)",
    priceEnvKey: "STRIPE_PRICE_TEAM",
  },
];

export function getStripePriceId(tier: PaidTier): string | null {
  const config = PAID_TIERS.find((t) => t.id === tier);
  if (!config) return null;
  return process.env[config.priceEnvKey]?.trim() || null;
}

export function tierFromStripePriceId(priceId: string): PaidTier | null {
  for (const tier of PAID_TIERS) {
    const envPrice = process.env[tier.priceEnvKey]?.trim();
    if (envPrice && envPrice === priceId) return tier.id;
  }
  return null;
}

export function quotaForTier(tier: PaidTier | "beta"): number {
  if (tier === "beta") return 0;
  const config = PAID_TIERS.find((t) => t.id === tier);
  return config?.quota ?? 0;
}

export function isPaidSubscription(tier: string): tier is PaidTier {
  return tier === "indie" || tier === "pro" || tier === "team";
}

/** User-facing label — internal `beta` tier means no paid subscription yet. */
export function tierDisplayName(tier: string): string {
  if (isPaidSubscription(tier)) return tier.toUpperCase();
  return "NO PLAN";
}

export function tierDisplayHint(tier: string): string {
  return isPaidSubscription(tier) ? "active subscription" : "subscribe in billing";
}

export function getTierConfig(tier: PaidTier): TierConfig {
  const config = PAID_TIERS.find((t) => t.id === tier);
  if (!config) throw new Error(`Unknown tier: ${tier}`);
  return config;
}
