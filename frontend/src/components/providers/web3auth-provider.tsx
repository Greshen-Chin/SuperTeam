"use client";

import { Web3Auth } from "@web3auth/modal";
import { AuthAdapter } from "@web3auth/auth-adapter";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import type { IProvider } from "@web3auth/base";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { getInjectedAdapters } from "@web3auth/default-solana-adapter";
import { WalletConnectV2Adapter } from "@web3auth/wallet-connect-v2-adapter";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/lib/env";

type Web3AuthCtxValue = {
  provider: IProvider | null;
  isConnected: boolean;
  ready: boolean;
  configured: boolean;
  initError: string | null;
  login: () => Promise<IProvider | null>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<{ name?: string; email?: string; profileImage?: string }>;
};

const Web3AuthCtx = createContext<Web3AuthCtxValue>({
  provider: null,
  isConnected: false,
  ready: false,
  configured: false,
  initError: null,
  login: async () => null,
  logout: async () => undefined,
  getUserInfo: async () => ({}),
});

export const useWeb3Auth = () => useContext(Web3AuthCtx);

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta" ? "0x65" : "0x67",
  rpcTarget: env.NEXT_PUBLIC_SOLANA_RPC_URL,
  displayName: `Solana ${env.NEXT_PUBLIC_SOLANA_CLUSTER}`,
  blockExplorerUrl: `https://explorer.solana.com?cluster=${env.NEXT_PUBLIC_SOLANA_CLUSTER}`,
  ticker: "SOL",
  tickerName: "Solana",
};

const web3AuthNetwork =
  env.NEXT_PUBLIC_WEB3AUTH_NETWORK === "sapphire_mainnet"
    ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
    : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;

export function Web3AuthProvider({ children }: { children: React.ReactNode }) {
  const w3aRef = useRef<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const configured = Boolean(env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const privateKeyProvider = new SolanaPrivateKeyProvider({
          config: { chainConfig },
        });

        const w3a = new Web3Auth({
          clientId: env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
          chainConfig,
          web3AuthNetwork,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          privateKeyProvider: privateKeyProvider as any,
          uiConfig: {
            appName: "VidChain",
            loginMethodsOrder: ["google", "email_passwordless"],
            defaultLanguage: "en",
          },
        });

        // Social login adapter — popup mode avoids redirect / WalletServices issues on localhost
        w3a.configureAdapter(
          new AuthAdapter({
            adapterSettings: {
              uxMode: "popup",
              whiteLabel: { appName: "VidChain" },
            },
          })
        );

        // Injected Solana wallets: Phantom, Solflare, Backpack — any Wallet Standard wallet
        // detected at runtime so only installed wallets appear in the modal
        const injectedAdapterOptions = {
          clientId: env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
          chainConfig,
          web3AuthNetwork,
        };
        for (const adapter of getInjectedAdapters({ options: injectedAdapterOptions })) {
          w3a.configureAdapter(adapter);
        }

        // WalletConnect v2 — adds MetaMask Mobile, Trust Wallet, Rainbow, Backpack, etc.
        // Requires NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (free at cloud.walletconnect.com)
        if (env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
          w3a.configureAdapter(
            new WalletConnectV2Adapter({
              adapterSettings: {
                walletConnectInitOptions: {
                  projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
                },
              },
              clientId: env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
              chainConfig,
              web3AuthNetwork,
            })
          );
        }

        await w3a.initModal();
        if (cancelled) return;

        w3aRef.current = w3a;

        if (w3a.connected && w3a.provider) {
          setProvider(w3a.provider);
          setIsConnected(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Web3Auth init failed:", err);
          setInitError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured]);

  const login = useCallback(async (): Promise<IProvider | null> => {
    const w3a = w3aRef.current;
    if (!w3a) throw new Error("Web3Auth tidak siap.");
    const p = await w3a.connect();
    if (p) {
      setProvider(p);
      setIsConnected(true);
    }
    return p ?? null;
  }, []);

  const logout = useCallback(async () => {
    const w3a = w3aRef.current;
    if (!w3a) return;
    await w3a.logout();
    setProvider(null);
    setIsConnected(false);
  }, []);

  const getUserInfo = useCallback(async () => {
    const w3a = w3aRef.current;
    if (!w3a) return {};
    try {
      const info = await w3a.getUserInfo();
      return {
        name: info.name ?? undefined,
        email: info.email ?? undefined,
        profileImage: info.profileImage ?? undefined,
      };
    } catch {
      return {};
    }
  }, []);

  const value = useMemo<Web3AuthCtxValue>(
    () => ({ provider, isConnected, ready, configured, initError, login, logout, getUserInfo }),
    [provider, isConnected, ready, configured, initError, login, logout, getUserInfo]
  );

  return <Web3AuthCtx.Provider value={value}>{children}</Web3AuthCtx.Provider>;
}
