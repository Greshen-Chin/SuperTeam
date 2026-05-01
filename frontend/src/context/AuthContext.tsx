"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import type { Keypair } from "@solana/web3.js";
import { deriveSolanaKeypairFromGoogleSub, exportPublicWallet } from "@/utils/walletDerivation";
import { getAppSalt, getGoogleClientId } from "@/utils/env";

type GoogleUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

type AuthContextValue = {
  user: GoogleUser | null;
  keypair: Keypair | null;
  publicAddress: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const googleClientId = getGoogleClientId() || "placeholder-not-configured";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthStateProvider>{children}</AuthStateProvider>
    </GoogleOAuthProvider>
  );
}

function AuthStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setError(null);
        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`
          }
        });

        if (!profileResponse.ok) {
          throw new Error("Login Google berhasil, tetapi profil tidak bisa dibaca.");
        }

        const profile = (await profileResponse.json()) as GoogleUser;
        if (!profile.sub) {
          throw new Error("Google tidak mengirim ID akun yang dibutuhkan.");
        }

        const nextKeypair = await deriveSolanaKeypairFromGoogleSub(profile.sub, getAppSalt());
        setUser(profile);
        setKeypair(nextKeypair);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Login Google gagal. Coba lagi.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Login Google dibatalkan atau gagal. Coba lagi.");
      setIsLoading(false);
    }
  });

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      keypair,
      publicAddress: keypair ? exportPublicWallet(keypair) : null,
      isLoggedIn: Boolean(user && keypair),
      isLoading,
      error,
      loginWithGoogle: () => {
        setIsLoading(true);
        setError(null);
        login();
      },
      logout: () => {
        setUser(null);
        setKeypair(null);
        setError(null);
      }
    };
  }, [error, isLoading, keypair, login, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
