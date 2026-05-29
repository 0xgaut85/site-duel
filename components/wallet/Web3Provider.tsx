"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { base, polygon } from "viem/chains";
import { useState, type ReactNode } from "react";
import { getPublicRpcUrl } from "@/lib/billing/crypto/config";

const wagmiConfig = createConfig({
  chains: [base, polygon],
  connectors: [injected()],
  transports: {
    [base.id]: http(getPublicRpcUrl("base")),
    [polygon.id]: http(getPublicRpcUrl("polygon")),
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
