import { base, polygon } from "viem/chains";
import type { Chain } from "viem";
import type { CryptoChain } from "@/lib/billing/crypto/config";
import { USDC_CONTRACTS } from "@/lib/billing/crypto/config";

export const CRYPTO_CHAINS: Record<CryptoChain, Chain> = {
  base,
  polygon,
};

export const CRYPTO_CHAIN_IDS: Record<CryptoChain, number> = {
  base: base.id,
  polygon: polygon.id,
};

export const CHAIN_BY_ID: Record<number, CryptoChain> = {
  [base.id]: "base",
  [polygon.id]: "polygon",
};

export function chainLabel(chain: CryptoChain): string {
  return chain === "base" ? "Base" : "Polygon";
}

export function usdcAddress(chain: CryptoChain) {
  return USDC_CONTRACTS[chain];
}

export function chainFromId(chainId: number): CryptoChain | null {
  return CHAIN_BY_ID[chainId] ?? null;
}
