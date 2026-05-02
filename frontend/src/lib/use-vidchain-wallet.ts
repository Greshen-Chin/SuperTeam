"use client";

import { useConnection, useWallet as useAdapterWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { SolanaWallet } from "@web3auth/solana-provider";
import { useEffect, useMemo, useState } from "react";
import { useWeb3Auth } from "@/components/providers/web3auth-provider";

export type VidchainWallet = {
  publicKey: PublicKey | null;
  source: "web3auth" | "adapter" | null;
  connected: boolean;
  connecting: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>;
};

export function useVidchainWallet(): VidchainWallet {
  const { provider, isConnected, ready, login, logout: w3aLogout } = useWeb3Auth();
  const adapter = useAdapterWallet();
  const { connection: _connection } = useConnection();
  const [w3aPubkey, setW3aPubkey] = useState<PublicKey | null>(null);

  // Resolve the Web3Auth public key whenever the provider changes
  useEffect(() => {
    if (!provider || !isConnected) {
      setW3aPubkey(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sw = new SolanaWallet(provider);
        const accounts = await sw.requestAccounts();
        const first = accounts[0];
        if (!cancelled) setW3aPubkey(first ? new PublicKey(first) : null);
      } catch {
        if (!cancelled) setW3aPubkey(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, isConnected]);

  const source: VidchainWallet["source"] = w3aPubkey
    ? "web3auth"
    : adapter.publicKey
      ? "adapter"
      : null;

  const publicKey = w3aPubkey ?? adapter.publicKey ?? null;

  return useMemo<VidchainWallet>(
    () => ({
      publicKey,
      source,
      connected: Boolean(publicKey),
      connecting: !ready || adapter.connecting,

      async loginWithGoogle() {
        await login();
      },

      async loginWithEmail() {
        await login();
      },

      async disconnect() {
        if (source === "web3auth") {
          await w3aLogout();
        }
        if (source === "adapter") await adapter.disconnect();
      },

      async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
        if (source === "web3auth" && provider) {
          const sw = new SolanaWallet(provider);
          return (await sw.signTransaction(tx as Transaction)) as T;
        }
        if (source === "adapter" && adapter.signTransaction) {
          return adapter.signTransaction(tx);
        }
        throw new Error("No wallet connected");
      },

      async signMessage(msg: Uint8Array): Promise<Uint8Array> {
        if (source === "web3auth" && provider) {
          const sw = new SolanaWallet(provider);
          return sw.signMessage(msg);
        }
        if (source === "adapter" && adapter.signMessage) {
          return adapter.signMessage(msg);
        }
        throw new Error("No wallet connected");
      },
    }),
    [publicKey, source, ready, provider, isConnected, adapter, login, w3aLogout]
  );
}
