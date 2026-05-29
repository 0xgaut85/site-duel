import { decodeEventLog, parseAbiItem, type Address, type Hash } from "viem";
import {
  getTreasuryAddress,
  USDC_CONTRACTS,
  EXPLORER_TX_URL,
  type CryptoChain,
} from "@/lib/billing/crypto/config";
import { withChainRpc } from "@/lib/billing/crypto/rpc";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

/** Max blocks per getLogs call (public RPCs reject huge ranges). */
const LOG_SCAN_LOOKBACK = 12_000n;
const LOG_SCAN_FALLBACK = 3_000n;

async function resolveScanFromBlock(
  client: Parameters<Parameters<typeof withChainRpc>[1]>[0],
  scanFromBlock: bigint,
): Promise<bigint> {
  const latest = await client.getBlockNumber();
  let from = scanFromBlock;

  if (from <= 0n) {
    from = latest > LOG_SCAN_LOOKBACK ? latest - LOG_SCAN_LOOKBACK : 0n;
  } else if (latest - from > LOG_SCAN_LOOKBACK) {
    from = latest - LOG_SCAN_LOOKBACK;
  }

  return from;
}

async function fetchTreasuryTransferLogs(
  client: Parameters<Parameters<typeof withChainRpc>[1]>[0],
  chain: CryptoChain,
  fromBlock: bigint,
) {
  const usdc = USDC_CONTRACTS[chain];
  const latest = await client.getBlockNumber();

  try {
    return await client.getLogs({
      address: usdc,
      event: transferEvent,
      args: { to: getTreasuryAddress()! },
      fromBlock,
      toBlock: latest,
    });
  } catch (err) {
    const narrowFrom =
      latest > LOG_SCAN_FALLBACK ? latest - LOG_SCAN_FALLBACK : 0n;
    console.warn(
      `[crypto] getLogs narrowed (${chain}, ${fromBlock}→${narrowFrom}):`,
      err,
    );
    return client.getLogs({
      address: usdc,
      event: transferEvent,
      args: { to: getTreasuryAddress()! },
      fromBlock: narrowFrom,
      toBlock: latest,
    });
  }
}

export async function getCurrentBlockNumber(chain: CryptoChain): Promise<bigint> {
  try {
    return await withChainRpc(chain, (client) => client.getBlockNumber());
  } catch (err) {
    console.error(
      `[crypto] getBlockNumber failed for ${chain}, scanning from genesis:`,
      err,
    );
    return 0n;
  }
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

  return withChainRpc(opts.chain, async (client) => {
  const excluded = new Set((opts.excludeTxHashes ?? []).map((h) => h.toLowerCase()));
  const fromBlock = await resolveScanFromBlock(client, opts.scanFromBlock);
  const logs = await fetchTreasuryTransferLogs(client, opts.chain, fromBlock);

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
  });
}

export function explorerUrl(chain: CryptoChain, txHash: string): string {
  return `${EXPLORER_TX_URL[chain]}${txHash}`;
}

/**
 * Verifies a specific transaction contains a USDC transfer to the treasury
 * for the exact intent amount.
 */
export async function verifyUsdcTransferTx(opts: {
  chain: CryptoChain;
  txHash: Hash;
  treasury: Address;
  amountMicroUsdc: number;
}): Promise<MatchedTransfer | null> {
  return withChainRpc(opts.chain, async (client) => {
  const usdc = USDC_CONTRACTS[opts.chain];

  const receipt = await client.getTransactionReceipt({ hash: opts.txHash });
  if (receipt.status !== "success") return null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdc.toLowerCase()) continue;

    try {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== "Transfer") continue;

      const { from, to, value } = decoded.args as {
        from: Address;
        to: Address;
        value: bigint;
      };

      if (to.toLowerCase() !== opts.treasury.toLowerCase()) continue;
      if (value !== BigInt(opts.amountMicroUsdc)) continue;

      return {
        txHash: opts.txHash,
        from,
        blockNumber: receipt.blockNumber,
      };
    } catch {
      continue;
    }
  }

  return null;
  });
}
