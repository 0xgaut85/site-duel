import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
  type Hash,
} from "viem";
import { base, polygon } from "viem/chains";
import {
  getRpcUrl,
  getTreasuryAddress,
  USDC_CONTRACTS,
  EXPLORER_TX_URL,
  type CryptoChain,
} from "@/lib/billing/crypto/config";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

function getClient(chain: CryptoChain) {
  const rpcUrl = getRpcUrl(chain);
  if (!rpcUrl) throw new Error(`RPC URL not configured for ${chain}.`);

  return createPublicClient({
    chain: chain === "base" ? base : polygon,
    transport: http(rpcUrl),
  });
}

export async function getCurrentBlockNumber(chain: CryptoChain): Promise<bigint> {
  const client = getClient(chain);
  return client.getBlockNumber();
}

export interface MatchedTransfer {
  txHash: Hash;
  from: Address;
  blockNumber: bigint;
}

/**
 * Scans USDC Transfer logs to the treasury for an exact amount since
 * `scanFromBlock`. Returns the first unclaimed matching transfer.
 */
export async function findMatchingUsdcTransfer(opts: {
  chain: CryptoChain;
  amountMicroUsdc: number;
  scanFromBlock: bigint;
  excludeTxHashes?: Hash[];
}): Promise<MatchedTransfer | null> {
  const treasury = getTreasuryAddress();
  if (!treasury) return null;

  const client = getClient(opts.chain);
  const usdc = USDC_CONTRACTS[opts.chain];
  const excluded = new Set((opts.excludeTxHashes ?? []).map((h) => h.toLowerCase()));

  const logs = await client.getLogs({
    address: usdc,
    event: transferEvent,
    args: { to: treasury },
    fromBlock: opts.scanFromBlock,
    toBlock: "latest",
  });

  for (const log of logs) {
    const value = log.args.value;
    if (value === undefined || value !== BigInt(opts.amountMicroUsdc)) continue;

    const txHash = log.transactionHash;
    if (!txHash || excluded.has(txHash.toLowerCase())) continue;

    return {
      txHash,
      from: log.args.from ?? ("0x0" as Address),
      blockNumber: log.blockNumber,
    };
  }

  return null;
}

export function explorerUrl(chain: CryptoChain, txHash: string): string {
  return `${EXPLORER_TX_URL[chain]}${txHash}`;
}
