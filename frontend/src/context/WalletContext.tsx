"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getSolanaRpcUrl } from "@/utils/env";
import { fetchWalletNfts } from "@/utils/metaplex";
import type { VidChainNft } from "@/utils/metaplex";
import { useAuth } from "@/context/AuthContext";

type WalletContextValue = {
  connection: Connection;
  balanceSol: number | null;
  nfts: VidChainNft[];
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { publicAddress } = useAuth();
  const connection = useMemo(() => new Connection(getSolanaRpcUrl(), "confirmed"), []);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [nfts, setNfts] = useState<VidChainNft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    if (!publicAddress) {
      setBalanceSol(null);
      setNfts([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const owner = new PublicKey(publicAddress);
      const [lamports, walletNfts] = await Promise.all([connection.getBalance(owner), fetchWalletNfts(connection, owner)]);
      setBalanceSol(lamports / LAMPORTS_PER_SOL);
      setNfts(walletNfts);
    } catch {
      setError("Data wallet belum bisa dimuat. Pastikan koneksi internet stabil dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicAddress]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  const value = useMemo<WalletContextValue>(() => {
    return {
      connection,
      balanceSol,
      nfts,
      isLoading,
      error,
      refreshWallet
    };
  }, [balanceSol, connection, error, isLoading, nfts, refreshWallet]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletData() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWalletData must be used inside WalletProvider.");
  }
  return value;
}
