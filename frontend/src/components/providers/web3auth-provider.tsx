"use client";

import type { IProvider } from "@web3auth/base";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/lib/env";

type Web3AuthInstance = InstanceType<typeof import("@web3auth/modal").Web3Auth>;

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
  chainNamespace: "solana",
  chainId: env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta" ? "0x65" : "0x67",
  rpcTarget: env.NEXT_PUBLIC_SOLANA_RPC_URL,
  displayName: `Solana ${env.NEXT_PUBLIC_SOLANA_CLUSTER}`,
  blockExplorerUrl: `https://explorer.solana.com?cluster=${env.NEXT_PUBLIC_SOLANA_CLUSTER}`,
  ticker: "SOL",
  tickerName: "Solana",
};

export function Web3AuthProvider({ children }: { children: React.ReactNode }) {
  const w3aRef = useRef<Web3AuthInstance | null>(null);
  const initPromiseRef = useRef<Promise<Web3AuthInstance | null> | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ready, setReady] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const configured = Boolean(env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID);

  const ensureWeb3Auth = useCallback((): Promise<Web3AuthInstance | null> => {
    if (!configured) return Promise.resolve(null);
    if (w3aRef.current) return Promise.resolve(w3aRef.current);
    if (initPromiseRef.current) return initPromiseRef.current;

    setReady(false);
    initPromiseRef.current = (async () => {
      try {
        const [
          { Web3Auth },
          { AuthAdapter },
          { CHAIN_NAMESPACES, WEB3AUTH_NETWORK },
          { SolanaPrivateKeyProvider },
          { getInjectedAdapters },
          { WalletConnectV2Adapter }
        ] = await Promise.all([
          import("@web3auth/modal"),
          import("@web3auth/auth-adapter"),
          import("@web3auth/base"),
          import("@web3auth/solana-provider"),
          import("@web3auth/default-solana-adapter"),
          import("@web3auth/wallet-connect-v2-adapter")
        ]);

        const web3AuthNetwork =
          env.NEXT_PUBLIC_WEB3AUTH_NETWORK === "sapphire_mainnet"
            ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
            : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;

        const resolvedChainConfig = {
          ...chainConfig,
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
        };

        const privateKeyProvider = new SolanaPrivateKeyProvider({
          config: { chainConfig: resolvedChainConfig },
        });

        const w3a = new Web3Auth({
          clientId: env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
          chainConfig: resolvedChainConfig,
          web3AuthNetwork,
          privateKeyProvider,
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
          chainConfig: resolvedChainConfig,
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
              chainConfig: resolvedChainConfig,
              web3AuthNetwork,
            })
          );
        }

        await w3a.initModal();

        w3aRef.current = w3a;

        if (w3a.connected && w3a.provider) {
          setProvider(w3a.provider);
          setIsConnected(true);
        }
        return w3a;
      } catch (err) {
        console.error("Web3Auth init failed:", err);
        setInitError(err instanceof Error ? err.message : String(err));
        initPromiseRef.current = null;
        return null;
      } finally {
        setReady(true);
      }
    })();

    return initPromiseRef.current;
  }, [configured]);

  useEffect(() => {
    if (!configured || typeof window === "undefined") return;

    const idle = window.setTimeout(() => {
      void ensureWeb3Auth();
    }, 2500);

    return () => window.clearTimeout(idle);
  }, [configured, ensureWeb3Auth]);

  const login = useCallback(async (): Promise<IProvider | null> => {
    const w3a = await ensureWeb3Auth();
    if (!w3a) throw new Error("Web3Auth tidak siap.");
    const p = await w3a.connect();
    if (p) {
      setProvider(p);
      setIsConnected(true);
    }
    return p ?? null;
  }, [ensureWeb3Auth]);

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
