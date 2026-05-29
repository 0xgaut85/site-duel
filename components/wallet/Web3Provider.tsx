"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, injected } from "wagmi";
import { base, polygon } from "viem/chains";
import { fallback, http } from "viem";
import { useState, type ReactNode } from "react";
import {
  getPublicRpcUrls,
  type CryptoChain,
} from "@/lib/billing/crypto/config";

function chainTransport(chain: CryptoChain) {
  return fallback(
    getPublicRpcUrls(chain).map((url) => http(url, { timeout: 12_000 })),
  );
}

const wagmiConfig = createConfig({
  chains: [base, polygon],
  connectors: [injected()],
  transports: {
    [base.id]: chainTransport("base"),
    [polygon.id]: chainTransport("polygon"),
  },
  ssr: true,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
