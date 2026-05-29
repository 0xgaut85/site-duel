import {
  InsufficientFundsError,
  UserRejectedRequestError,
} from "viem";
import type { CryptoChain } from "./config";
import { chainLabel } from "./chains";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "";
}

function errorName(err: unknown): string {
  if (err instanceof Error) return err.name;
  return "";
}

/** Map wallet / RPC errors to user-facing checkout copy. */
export function formatWalletPaymentError(
  err: unknown,
  chain: CryptoChain,
): string {
  if (err instanceof UserRejectedRequestError) {
    return "";
  }

  const msg = errorMessage(err).toLowerCase();
  const name = errorName(err).toLowerCase();

  if (
    err instanceof InsufficientFundsError ||
    name.includes("insufficient") ||
    msg.includes("insufficient funds")
  ) {
    if (msg.includes("gas") || msg.includes("intrinsic")) {
      return chain === "base"
        ? "Add a small amount of ETH on Base for gas, then try again."
        : "Add a small amount of MATIC on Polygon for gas, then try again.";
    }
    return "Insufficient USDC balance in your wallet.";
  }

  if (
    msg.includes("wrong network") ||
    (msg.includes("chain") && msg.includes("mismatch")) ||
    name.includes("chainmismatch")
  ) {
    return `Switch your wallet to ${chainLabel(chain)}, then try again.`;
  }

  if (msg.includes("rejected") || msg.includes("denied")) {
    return "";
  }

  if (
    msg.includes("rpc") ||
    msg.includes("timeout") ||
    msg.includes("fetch") ||
    msg.includes("network")
  ) {
    return "Network error. Check your connection and try again.";
  }

  if (msg.includes("revert") || msg.includes("execution")) {
    return `Transaction failed on ${chainLabel(chain)}. Confirm you have USDC and gas, then try again.`;
  }

  return "Transaction failed. Open your wallet for details, then try again.";
}
