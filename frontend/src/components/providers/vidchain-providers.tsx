"use client";

import { Web3AuthProvider } from "./web3auth-provider";

export function VidchainProviders({ children }: { children: React.ReactNode }) {
  return <Web3AuthProvider>{children}</Web3AuthProvider>;
}
