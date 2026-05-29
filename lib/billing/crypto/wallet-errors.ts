import {
  InsufficientFundsError,
  UserRejectedRequestError,
} from "viem";
import type { CryptoChain } from "./config";
import { chainLabel } from "./chains";

function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;

  for (let depth = 0; depth < 8 && cur; depth++) {
    if (typeof cur === "string") {
      parts.push(cur);
      break;
    }

    if (cur instanceof Error) {
      parts.push(cur.message);
      const short = (cur as Error & { shortMessage?: string }).shortMessage;
      if (short) parts.push(short);
      cur = cur.cause;
      continue;
    }

    if (typeof cur === "object" && cur !== null) {
      const record = cur as Record<string, unknown>;
      if (typeof record.message === "string") parts.push(record.message);
      if (typeof record.shortMessage === "string") parts.push(record.shortMessage);
      if (typeof record.details === "string") parts.push(record.details);
      cur = record.cause;
      continue;
    }

    break;
  }

  return parts.join(" ").toLowerCase();
}

/** Map wallet / RPC errors to user-facing checkout copy. */
export function formatWalletPaymentError(
  err: unknown,
  chain: CryptoChain,
): string {
  if (err instanceof UserRejectedRequestError) {
    return "";
  }

  const msg = collectErrorText(err);
  const name =
    err instanceof Error ? err.name.toLowerCase() : "";

  if (
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("rejected the request") ||
    msg.includes("denied transaction") ||
    msg.includes("action_rejected")
  ) {
    return "";
  }

  if (
    err instanceof InsufficientFundsError ||
    name.includes("insufficient") ||
    msg.includes("insufficient funds") ||
    msg.includes("exceeds balance") ||
    msg.includes("transfer amount exceeds") ||
    msg.includes("erc20: transfer amount exceeds")
  ) {
    if (msg.includes("gas") || msg.includes("intrinsic")) {
      return chain === "base"
        ? "Add a small amount of ETH on Base for gas, then try again."
        : "Add a small amount of MATIC on Polygon for gas, then try again.";
    }
    return `Insufficient USDC on ${chainLabel(chain)}. Use native USDC on this network.`;
  }

  if (
    msg.includes("wrong network") ||
    (msg.includes("chain") && msg.includes("mismatch")) ||
    name.includes("chainmismatch")
  ) {
    return `Switch your wallet to ${chainLabel(chain)}, then try again.`;
  }

  if (
    msg.includes("rpc") ||
    msg.includes("timeout") ||
    msg.includes("fetch failed") ||
    msg.includes("network error")
  ) {
    return "Network error. Check your connection and try again.";
  }

  if (msg.includes("revert") || msg.includes("execution")) {
    return `Transaction reverted on ${chainLabel(chain)}. Confirm native USDC and gas, then try again.`;
  }

  if (msg.includes("nonce")) {
    return "Wallet nonce error. Reset the pending transaction in your wallet and try again.";
  }

  return "Transaction failed. Open your wallet for details, then try again.";
}
