"use client";

import { Web3Provider } from "@/components/wallet/Web3Provider";
import type { ReactNode } from "react";

export function BillingWeb3Provider({ children }: { children: ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}
