"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import bs58 from "bs58";
import { useVidchainWallet } from "@/lib/use-vidchain-wallet";
import { useWeb3Auth } from "@/components/providers/web3auth-provider";
import { loginWithWallet, persistAuth, requestWalletNonce } from "@/lib/auth-client";

type AuthUser = {
  name: string;
  email: string;
  picture?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  publicAddress: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: () => void;
  loginWithEmail: () => void;
  logout: () => void;
  refreshJwt: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthStateProvider>{children}</AuthStateProvider>;
}

function isUserClosedError(msg: string) {
  const lower = msg.toLowerCase();
  return lower.includes("user closed") || lower.includes("popup closed") || lower.includes("modal closed");
}

function AuthStateProvider({ children }: { children: ReactNode }) {
  const wallet = useVidchainWallet();
  const { getUserInfo } = useWeb3Auth();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch display name/email from Web3Auth when connected.
  // Works for social login (Google/Email) — wallet-only connections return empty info, which is fine.
  useEffect(() => {
    if (!wallet.connected) {
      setUser(null);
      return;
    }
    (async () => {
      const info = await getUserInfo();
      if (info.name ?? info.email) {
        setUser({
          name: info.name ?? info.email ?? "VidChain User",
          email: info.email ?? "",
          picture: info.profileImage,
        });
      }
    })();
  }, [wallet.connected, getUserInfo]);

  const loginWithGoogle = useCallback(() => {
    setIsLoading(true);
    setError(null);
    wallet
      .loginWithGoogle()
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!isUserClosedError(msg)) setError(msg || "Login gagal. Coba lagi.");
      })
      .finally(() => setIsLoading(false));
  }, [wallet]);

  const loginWithEmail = useCallback(() => {
    setIsLoading(true);
    setError(null);
    wallet
      .loginWithEmail()
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!isUserClosedError(msg)) setError(msg || "Login gagal. Coba lagi.");
      })
      .finally(() => setIsLoading(false));
  }, [wallet]);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    void wallet.disconnect();
  }, [wallet]);

  const refreshJwt = useCallback(async () => {
    const address = wallet.publicKey?.toBase58();
    if (!address) throw new Error("No wallet connected. Please log in again.");
    const { nonce } = await requestWalletNonce(address);
    const messageBytes = new TextEncoder().encode(`Login nonce: ${nonce}`);
    const sig = await wallet.signMessage(messageBytes);
    const signature = bs58.encode(sig);
    const result = await loginWithWallet({ address, signature, nonce });
    persistAuth(result);
  }, [wallet]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      publicAddress: wallet.publicKey?.toBase58() ?? null,
      isLoggedIn: wallet.connected,
      isLoading: isLoading || wallet.connecting,
      error,
      loginWithGoogle,
      loginWithEmail,
      logout,
      refreshJwt,
    }),
    [user, wallet.publicKey, wallet.connected, wallet.connecting, isLoading, error, loginWithGoogle, loginWithEmail, logout, refreshJwt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
