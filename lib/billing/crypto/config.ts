import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import { getPrimaryRpcUrl, getRpcUrls } from "@/lib/billing/crypto/rpc";

export type CryptoChain = "base" | "polygon";

/** Circle native USDC — see https://developers.circle.com/stablecoins/usdc-contract-addresses */
export const USDC_CONTRACTS: Record<CryptoChain, Address> = {
  base: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
  polygon: getAddress("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"),
};

export function normalizeCryptoAddress(raw: string): Address {
  return getAddress(raw.trim());
}

export const EXPLORER_TX_URL: Record<CryptoChain, string> = {
  base: "https://basescan.org/tx/",
  polygon: "https://polygonscan.com/tx/",
};

export const INTENT_TTL_MS = 30 * 60 * 1000;

export function getTreasuryAddress(): Address | null {
  const raw = process.env.CRYPTO_TREASURY_ADDRESS?.trim();
  if (!raw || !isAddress(raw)) return null;
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

export function getRpcUrl(chain: CryptoChain): string | null {
  try {
    return getPrimaryRpcUrl(chain);
  } catch {
    return null;
  }
}

export function hasRpcForChain(chain: CryptoChain): boolean {
  try {
    return getRpcUrls(chain).length > 0;
  } catch {
    return false;
  }
}

const CLIENT_RPC_FALLBACKS: Record<CryptoChain, string[]> = {
  base: [
    "https://mainnet.base.org",
    "https://base.llamarpc.com",
    "https://1rpc.io/base",
  ],
  polygon: [
    "https://polygon.llamarpc.com",
    "https://polygon-rpc.com",
    "https://rpc.ankr.com/polygon",
    "https://1rpc.io/matic",
  ],
};

/** Client-side RPC URLs (NEXT_PUBLIC_* first), with public fallbacks. */
export function getPublicRpcUrls(chain: CryptoChain): string[] {
  const envKey =
    chain === "base" ? "NEXT_PUBLIC_BASE_RPC_URL" : "NEXT_PUBLIC_POLYGON_RPC_URL";
  const fromEnv =
    typeof process !== "undefined" ? process.env[envKey]?.trim() : undefined;

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const raw of [fromEnv, ...CLIENT_RPC_FALLBACKS[chain]]) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/** Primary client RPC (first in {@link getPublicRpcUrls}). */
export function getPublicRpcUrl(chain: CryptoChain): string {
  return getPublicRpcUrls(chain)[0]!;
}

export function isCryptoBillingConfigured(): boolean {
  return Boolean(
    getTreasuryAddress() &&
      hasRpcForChain("base") &&
      hasRpcForChain("polygon"),
  );
}
