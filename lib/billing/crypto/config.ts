import type { Address } from "viem";
import { getPrimaryRpcUrl, getRpcUrls } from "@/lib/billing/crypto/rpc";

export type CryptoChain = "base" | "polygon";

export const USDC_CONTRACTS: Record<CryptoChain, Address> = {
  base: "0x833589fCD6eDb6E08f4c7C32D458f1eb69470eB70",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
};

export const EXPLORER_TX_URL: Record<CryptoChain, string> = {
  base: "https://basescan.org/tx/",
  polygon: "https://polygonscan.com/tx/",
};

export const INTENT_TTL_MS = 30 * 60 * 1000;

export function getTreasuryAddress(): Address | null {
  const raw = process.env.CRYPTO_TREASURY_ADDRESS?.trim();
  if (!raw || !/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  return raw as Address;
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

const CLIENT_RPC_FALLBACK: Record<CryptoChain, string> = {
  base: "https://mainnet.base.org",
  polygon: "https://polygon.llamarpc.com",
};

/** Client-side RPC URLs (NEXT_PUBLIC_*), aligned with server fallbacks. */
export function getPublicRpcUrl(chain: CryptoChain): string {
  const envKey =
    chain === "base" ? "NEXT_PUBLIC_BASE_RPC_URL" : "NEXT_PUBLIC_POLYGON_RPC_URL";
  const fromEnv =
    typeof process !== "undefined" ? process.env[envKey]?.trim() : undefined;
  if (fromEnv) return fromEnv;
  return CLIENT_RPC_FALLBACK[chain];
}

export function isCryptoBillingConfigured(): boolean {
  return Boolean(
    getTreasuryAddress() &&
      hasRpcForChain("base") &&
      hasRpcForChain("polygon"),
  );
}
