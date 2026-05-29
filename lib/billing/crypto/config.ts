import type { Address } from "viem";

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

const PUBLIC_RPC_FALLBACK: Record<CryptoChain, string> = {
  base: "https://mainnet.base.org",
  polygon: "https://polygon-rpc.com",
};

export function getRpcUrl(chain: CryptoChain): string | null {
  const envKey = chain === "base" ? "BASE_RPC_URL" : "POLYGON_RPC_URL";
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  return PUBLIC_RPC_FALLBACK[chain];
}

/** Client-side RPC URLs (NEXT_PUBLIC_*), aligned with server fallbacks. */
export function getPublicRpcUrl(chain: CryptoChain): string {
  const envKey =
    chain === "base" ? "NEXT_PUBLIC_BASE_RPC_URL" : "NEXT_PUBLIC_POLYGON_RPC_URL";
  const fromEnv =
    typeof process !== "undefined" ? process.env[envKey]?.trim() : undefined;
  if (fromEnv) return fromEnv;
  return PUBLIC_RPC_FALLBACK[chain];
}

export function isCryptoBillingConfigured(): boolean {
  return Boolean(getTreasuryAddress() && getRpcUrl("base") && getRpcUrl("polygon"));
}
