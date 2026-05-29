import { createPublicClient, http } from "viem";
import { base, polygon } from "viem/chains";
import type { CryptoChain } from "@/lib/billing/crypto/config";

const VIEM_CHAINS = { base, polygon } as const;

function uniqueUrls(urls: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Ordered RPC endpoints: env first, then public fallbacks. */
export function getRpcUrls(chain: CryptoChain): string[] {
  const envKey = chain === "base" ? "BASE_RPC_URL" : "POLYGON_RPC_URL";
  const fromEnv = process.env[envKey];

  const fallbacks =
    chain === "base"
      ? [
          "https://mainnet.base.org",
          "https://base.llamarpc.com",
          "https://1rpc.io/base",
        ]
      : [
          "https://polygon.llamarpc.com",
          "https://polygon-rpc.com",
          "https://rpc.ankr.com/polygon",
          "https://1rpc.io/matic",
        ];

  const urls = uniqueUrls([fromEnv, ...fallbacks]);
  if (urls.length === 0) {
    throw new Error(`RPC URL not configured for ${chain}.`);
  }
  return urls;
}

export function getPrimaryRpcUrl(chain: CryptoChain): string {
  return getRpcUrls(chain)[0]!;
}

export function createChainClient(chain: CryptoChain, rpcUrl?: string) {
  const url = rpcUrl ?? getPrimaryRpcUrl(chain);
  return createPublicClient({
    chain: VIEM_CHAINS[chain],
    transport: http(url, { timeout: 12_000 }),
  });
}

export type ChainPublicClient = ReturnType<typeof createChainClient>;

/** Tries each RPC until `fn` succeeds. */
export async function withChainRpc<T>(
  chain: CryptoChain,
  fn: (client: ChainPublicClient) => Promise<T>,
): Promise<T> {
  const urls = getRpcUrls(chain);
  let lastError: unknown;

  for (const url of urls) {
    try {
      return await fn(createChainClient(chain, url));
    } catch (err) {
      lastError = err;
      console.warn(`[crypto] RPC failed (${chain}, ${url}):`, err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All RPC endpoints failed for ${chain}.`);
}
