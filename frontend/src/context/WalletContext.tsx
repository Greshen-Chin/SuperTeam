"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { fetchWalletNfts } from "@/utils/metaplex";
import type { VidChainNft } from "@/utils/metaplex";
import { useVidchainWallet } from "@/lib/use-vidchain-wallet";
import { env } from "@/lib/env";
import { Connection } from "@solana/web3.js";

type WalletContextValue = {
  balanceSol: number | null;
  nfts: VidChainNft[];
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useVidchainWallet();
  const connection = useMemo(() => new Connection(env.NEXT_PUBLIC_SOLANA_RPC_URL, "confirmed"), []);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [nfts, setNfts] = useState<VidChainNft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!publicKey) {
      setBalanceSol(null);
      setNfts([]);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const [lamports, walletNfts] = await Promise.all([
        connection.getBalance(publicKey),
        fetchWalletNfts(connection, publicKey),
      ]);
      setBalanceSol(lamports / LAMPORTS_PER_SOL);
      setNfts(walletNfts);
    } catch {
      setError("Data wallet belum bisa dimuat. Pastikan koneksi internet stabil dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  const value = useMemo<WalletContextValue>(
    () => ({ balanceSol, nfts, isLoading, error, refreshWallet }),
    [balanceSol, nfts, isLoading, error, refreshWallet]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletData() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWalletData must be used inside WalletProvider.");
  }
  return value;
}
