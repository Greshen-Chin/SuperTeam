"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { VidchainProviders } from "@/components/providers/vidchain-providers";
import { AuthProvider } from "@/context/AuthContext";
import { routes } from "@/lib/routes";

const WalletProvider = dynamic(
  () => import("@/context/WalletContext").then((mod) => mod.WalletProvider),
  { ssr: false }
);

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const needsWalletData = pathname === routes.wallet;

  return (
    <VidchainProviders>
      <AuthProvider>
        {needsWalletData ? <WalletProvider>{children}</WalletProvider> : children}
      </AuthProvider>
    </VidchainProviders>
  );
}
