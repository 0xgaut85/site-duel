"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import type { Address } from "viem";
import { UserRejectedRequestError } from "viem";
import type { CryptoChain } from "@/lib/billing/crypto/config";
import {
  CRYPTO_CHAIN_IDS,
  chainLabel,
  usdcAddress,
} from "@/lib/billing/crypto/chains";
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

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatUsdcBalance(balance: bigint): string {
  const whole = balance / 1_000_000n;
  const frac = (balance % 1_000_000n).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}

export function useCryptoCheckoutPayment(opts: {
  intent: CryptoIntentForPayment | null;
  chain: CryptoChain;
  onConfirmed: (explorerUrl: string | null) => void;
}) {
  const { intent, chain, onConfirmed } = opts;
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, isPending: isConnecting } = useConnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [phase, setPhase] = useState<CryptoPaymentPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Address | null>(null);

  const targetChainId = CRYPTO_CHAIN_IDS[chain];
  const onTargetChain = chainId === targetChainId;

  const { data: usdcBalance } = useReadContract({
    address: usdcAddress(chain),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && onTargetChain && intent),
    },
  });

  const { isLoading: isWaitingReceipt, isSuccess: receiptConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash ?? undefined,
      chainId: targetChainId,
    });

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

  const switchToChain = useCallback(async () => {
    setError(null);
    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (err) {
      if (err instanceof UserRejectedRequestError) {
        setError(null);
      } else {
        setError(`Could not switch to ${chainLabel(chain)}. Try again in your wallet.`);
      }
    }
  }, [switchChainAsync, targetChainId, chain]);

  const payWithUsdc = useCallback(async () => {
    if (!intent || !address) return;

    setError(null);

    const required = BigInt(intent.amountMicroUsdc);
    if (usdcBalance != null && usdcBalance < required) {
      setError("Insufficient USDC balance in your wallet.");
      return;
    }

    setPhase("paying");

    try {
      const hash = await writeContractAsync({
        chainId: targetChainId,
        address: usdcAddress(chain),
        abi: erc20Abi,
        functionName: "transfer",
        args: [intent.treasuryAddress as Address, required],
      });

      setTxHash(hash);
      setPhase("confirming");
    } catch (err) {
      setPhase("ready");
      if (err instanceof UserRejectedRequestError) {
        setError(null);
        return;
      }
      setError("Payment failed. Check your wallet balance and network, then try again.");
    }
  }, [
    intent,
    address,
    usdcBalance,
    writeContractAsync,
    targetChainId,
    chain,
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
    isSwitching,
    isWaitingReceipt,
    connectWallet,
    switchToChain,
    payWithUsdc,
    onTargetChain,
    isConnected,
  };
}
