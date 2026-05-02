"use client";

import type { ReactNode } from "react";
import { VidchainProviders } from "@/components/providers/vidchain-providers";
import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <VidchainProviders>
      <AuthProvider>
        <WalletProvider>{children}</WalletProvider>
      </AuthProvider>
    </VidchainProviders>
  );
}
