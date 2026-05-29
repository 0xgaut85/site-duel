"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import type { Address, PublicClient } from "viem";
import { UserRejectedRequestError } from "viem";
import type { CryptoChain } from "@/lib/billing/crypto/config";
import {
  CRYPTO_CHAIN_IDS,
  chainLabel,
  usdcAddress,
} from "@/lib/billing/crypto/chains";
import { formatWalletPaymentError } from "@/lib/billing/crypto/wallet-errors";
import { erc20Abi } from "@/lib/billing/crypto/usdc";

export type CryptoPaymentPhase =
  | "idle"
  | "connecting"
  | "wrong_chain"
  | "ready"
  | "paying"
  | "confirming"
  | "processing";

interface CryptoIntentForPayment {
  intentId: string;
  amountUsdc: string;
  amountMicroUsdc: number;
  treasuryAddress: string;
  chain: CryptoChain;
}

/** Minimum native balance for gas (wei). */
const MIN_NATIVE_GAS: Record<CryptoChain, bigint> = {
  base: 100_000_000_000_000n, // 0.0001 ETH
  polygon: 50_000_000_000_000_000n, // 0.05 MATIC
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatUsdcBalance(balance: bigint): string {
  const whole = balance / 1_000_000n;
  const frac = (balance % 1_000_000n).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}

async function readUsdcBalance(
  client: PublicClient,
  chain: CryptoChain,
  wallet: Address,
): Promise<bigint | null> {
  try {
    return await client.readContract({
      address: usdcAddress(chain),
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [wallet],
    });
  } catch {
    return null;
  }
}

export function useCryptoCheckoutPayment(opts: {
  intent: CryptoIntentForPayment | null;
  chain: CryptoChain;
  onConfirmed: (explorerUrl: string | null) => void;
}) {
  const { intent, chain, onConfirmed } = opts;
  const paymentChain = intent?.chain ?? chain;
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const targetChainId = CRYPTO_CHAIN_IDS[paymentChain];
  const publicClient = usePublicClient({ chainId: targetChainId });
  const onTargetChain = chainId === targetChainId;

  const [phase, setPhase] = useState<CryptoPaymentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Address | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);

  const { isLoading: isWaitingReceipt, isSuccess: receiptConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash ?? undefined,
      chainId: targetChainId,
    });

  useEffect(() => {
    if (!address || !onTargetChain || !intent || !publicClient) {
      setUsdcBalance(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const balance = await readUsdcBalance(publicClient, paymentChain, address);
      if (!cancelled) setUsdcBalance(balance);
    };

    void load();
    const id = window.setInterval(() => void load(), 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [address, onTargetChain, intent, publicClient, paymentChain]);

  useEffect(() => {
    if (!intent) {
      setPhase("idle");
      setError(null);
      setTxHash(null);
      return;
    }

    if (!isConnected) {
      setPhase("idle");
      return;
    }

    if (!onTargetChain) {
      setPhase("wrong_chain");
      return;
    }

    if (phase === "paying" || phase === "confirming" || phase === "processing") {
      return;
    }

    setPhase("ready");
  }, [intent, isConnected, onTargetChain, phase]);

  const connectWallet = useCallback(async () => {
    setError(null);
    setPhase("connecting");
    try {
      await connectAsync({ connector: injected() });
    } catch (err) {
      if (err instanceof UserRejectedRequestError) {
        setError(null);
      } else {
        setError("Could not connect wallet. Try again.");
      }
      setPhase("idle");
    }
  }, [connectAsync]);

  const disconnectWallet = useCallback(async () => {
    setError(null);
    setTxHash(null);
    setUsdcBalance(null);
    setPhase("idle");
    try {
      await disconnectAsync();
    } catch {
      /* ignore */
    }
  }, [disconnectAsync]);

  const changeWallet = useCallback(async () => {
    setError(null);
    setTxHash(null);
    setUsdcBalance(null);
    setPhase("connecting");
    try {
      await disconnectAsync();
      await connectAsync({ connector: injected() });
    } catch (err) {
      if (err instanceof UserRejectedRequestError) {
        setError(null);
      } else {
        setError("Could not connect wallet. Try again.");
      }
      setPhase("idle");
    }
  }, [disconnectAsync, connectAsync]);

  const switchToChain = useCallback(async () => {
    setError(null);
    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (err) {
      if (err instanceof UserRejectedRequestError) {
        setError(null);
      } else {
        setError(
          `Could not switch to ${chainLabel(paymentChain)}. Try again in your wallet.`,
        );
      }
    }
  }, [switchChainAsync, targetChainId, paymentChain]);

  const payWithUsdc = useCallback(async () => {
    if (!intent || !address) return;

    if (!onTargetChain) {
      setError(`Switch your wallet to ${chainLabel(paymentChain)} before paying.`);
      return;
    }

    setError(null);
    const required = BigInt(intent.amountMicroUsdc);

    const balance =
      publicClient != null
        ? await readUsdcBalance(publicClient, paymentChain, address)
        : null;

    if (balance != null) {
      setUsdcBalance(balance);
      if (balance < required) {
        setError("Insufficient USDC balance in your wallet.");
        return;
      }
    }

    if (publicClient) {
      try {
        const nativeBalance = await publicClient.getBalance({ address });
        if (nativeBalance < MIN_NATIVE_GAS[paymentChain]) {
          setError(
            paymentChain === "base"
              ? "Add a small amount of ETH on Base for gas, then try again."
              : "Add a small amount of MATIC on Polygon for gas, then try again.",
          );
          return;
        }
      } catch {
        setError("Could not verify gas balance. Check your network and try again.");
        return;
      }
    }

    setPhase("paying");

    try {
      const hash = await writeContractAsync({
        account: address,
        chainId: targetChainId,
        address: usdcAddress(paymentChain),
        abi: erc20Abi,
        functionName: "transfer",
        args: [intent.treasuryAddress as Address, required],
      });

      setTxHash(hash);
      setPhase("confirming");
    } catch (err) {
      setPhase("ready");
      console.error("[crypto] USDC transfer failed:", err);
      if (err instanceof UserRejectedRequestError) {
        setError(null);
        return;
      }
      const message = formatWalletPaymentError(err, paymentChain);
      setError(message || "Transaction failed. Open your wallet for details.");
    }
  }, [
    intent,
    address,
    onTargetChain,
    paymentChain,
    publicClient,
    writeContractAsync,
    targetChainId,
  ]);

  useEffect(() => {
    if (!receiptConfirmed || !txHash || !intent || phase !== "confirming") return;

    let cancelled = false;

    const submit = async () => {
      setPhase("processing");

      try {
        const res = await fetch(
          `/api/billing/crypto-intent/${intent.intentId}/submit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash }),
          },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          status?: "pending" | "confirmed" | "expired";
          explorerUrl?: string;
          message?: string;
        };

        if (cancelled) return;

        if (data.status === "confirmed") {
          onConfirmed(data.explorerUrl ?? null);
          return;
        }

        if (data.status === "expired") {
          setError("This payment session expired. Start a new one to continue.");
          setPhase("ready");
          return;
        }

        setError("Payment submitted. Waiting for confirmation…");
        setPhase("processing");
      } catch {
        if (!cancelled) {
          setError("Network error while confirming payment. We'll keep checking.");
          setPhase("processing");
        }
      }
    };

    void submit();
    return () => {
      cancelled = true;
    };
  }, [receiptConfirmed, txHash, intent, phase, onConfirmed]);

  return {
    address,
    truncatedAddress: address ? truncateAddress(address) : null,
    usdcBalanceLabel:
      usdcBalance != null ? `${formatUsdcBalance(usdcBalance)} USDC` : null,
    phase,
    error,
    isConnecting,
    isDisconnecting,
    isSwitching,
    isWaitingReceipt,
    connectWallet,
    disconnectWallet,
    changeWallet,
    switchToChain,
    payWithUsdc,
    onTargetChain,
    isConnected,
  };
}
