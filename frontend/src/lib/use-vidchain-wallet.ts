"use client";

import { PublicKey } from "@solana/web3.js";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { SolanaWallet } from "@web3auth/solana-provider";
import { useEffect, useMemo, useState } from "react";
import { useWeb3Auth } from "@/components/providers/web3auth-provider";

export type VidchainWallet = {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
};

export function useVidchainWallet(): VidchainWallet {
  const { provider, isConnected, ready, login, logout } = useWeb3Auth();
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);

  // Resolve the public key from the Web3Auth provider whenever it changes.
  // Works for all connection paths: Google/Email social login, Phantom, Solflare,
  // Backpack (Wallet Standard), and WalletConnect wallets (MetaMask Mobile, Trust, etc.)
  useEffect(() => {
    if (!provider || !isConnected) {
      setPublicKey(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sw = new SolanaWallet(provider);
        const accounts = await sw.requestAccounts();
        const first = accounts[0];
        if (!cancelled) setPublicKey(first ? new PublicKey(first) : null);
      } catch {
        if (!cancelled) setPublicKey(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, isConnected]);

  return useMemo<VidchainWallet>(
    () => ({
      publicKey,
      connected: Boolean(publicKey),
      connecting: !ready,

      async loginWithGoogle() {
        await login();
      },

      async loginWithEmail() {
        await login();
      },

      async disconnect() {
        await logout();
      },

      async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
        if (!provider) throw new Error("No wallet connected");
        const sw = new SolanaWallet(provider);
        return (await sw.signTransaction(tx as Transaction)) as T;
      },

      async signMessage(msg: Uint8Array): Promise<Uint8Array> {
        if (!provider) throw new Error("No wallet connected");
        const sw = new SolanaWallet(provider);
        return sw.signMessage(msg);
      },
    }),
    [publicKey, ready, provider, login, logout]
  );
}
