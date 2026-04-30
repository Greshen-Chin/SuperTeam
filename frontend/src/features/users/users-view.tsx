"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Link2, Mail, ShieldCheck, UserRound, Wallet } from "lucide-react";
import bs58 from "bs58";
import { Button } from "@/components/ui/button";
import {
  type AuthUser,
  getAccessToken,
  getCurrentUser,
  linkGoogleToken,
  linkWallet,
  listUsers,
  persistAuth,
  requestWalletNonce
} from "@/lib/auth-client";
import { routes } from "@/lib/routes";

type BusyState = "loading" | "google" | "wallet" | null;

export function UsersView() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [busy, setBusy] = useState<BusyState>("loading");
  const [message, setMessage] = useState("Loading account from database...");
  const [error, setError] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const connectedCount = useMemo(() => {
    return [user?.email, user?.googleEmail, user?.walletAddress].filter(Boolean).length;
  }, [user]);

  const refreshUsers = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.push(routes.login);
      return;
    }

    try {
      setBusy("loading");
      setError(null);
      const [meResult, usersResult] = await Promise.all([getCurrentUser(token), listUsers(token)]);
      setUser(meResult.user);
      setUsers(usersResult.users);
      setMessage("Profile loaded from database.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load users.");
    } finally {
      setBusy(null);
    }
  }, [router]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [googleClientId]);

  function connectGoogle() {
    const token = getAccessToken();
    if (!token) {
      router.push(routes.login);
      return;
    }

    if (!googleClientId || !window.google?.accounts.oauth2) {
      setError("Google SDK is not ready. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID and try again.");
      return;
    }

    setBusy("google");
    setError(null);
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: "openid email profile",
      prompt: "select_account",
      callback: async (response) => {
        if (!response.access_token) {
          setBusy(null);
          setError(response.error ?? "Google did not return an access token.");
          return;
        }

        try {
          setMessage("Connecting Google account...");
          const result = await linkGoogleToken({ token: response.access_token, accessToken: token });
          persistAuth(result);
          setUser(result.user);
          setMessage("Google account connected and saved to database.");
          await refreshUsers();
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Could not connect Google.");
        } finally {
          setBusy(null);
        }
      }
    });
    tokenClient.requestAccessToken();
  }

  async function connectWallet() {
    const token = getAccessToken();
    if (!token) {
      router.push(routes.login);
      return;
    }

    try {
      setBusy("wallet");
      setError(null);
      setMessage("Waiting for Phantom...");

      const phantom = window.phantom?.solana ?? window.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet is not available in this browser.");
      }

      const connected = await phantom.connect();
      const address = connected.publicKey.toString();
      const { nonce } = await requestWalletNonce(address);
      const messageBytes = new TextEncoder().encode(`Login nonce: ${nonce}`);
      const signed = await phantom.signMessage(messageBytes, "utf8");
      const signature = bs58.encode(signed.signature);

      const result = await linkWallet({ address, signature, nonce, token });
      persistAuth(result);
      setUser(result.user);
      setMessage("Phantom wallet connected and saved to database.");
      await refreshUsers();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not connect wallet.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--app-bg)]">
      <section className="border-b border-[var(--app-line)]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Users</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-[var(--app-fg)] md:text-6xl">
            Account identity and linked providers.
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--app-muted)]">
            Register and login stay on the VidChain database. Google and Phantom only update your existing profile when connected here.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_0.85fr]">
        <main className="glass-panel rounded-3xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--app-fg)]">Your profile</h2>
              <p className="mt-2 text-sm text-[var(--app-muted)]">{message}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              <CheckCircle2 size={16} />
              {connectedCount}/3 connected
            </div>
          </div>

          {error ? <p className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <IdentityTile icon={<Mail size={20} />} label="Database email" value={user?.email ?? "Not registered"} />
            <IdentityTile icon={<ShieldCheck size={20} />} label="Google account" value={user?.googleEmail ?? "Not connected"} />
            <IdentityTile icon={<Wallet size={20} />} label="Phantom wallet" value={user?.walletAddress ?? "Not connected"} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4">
              <div className="flex items-center gap-3">
                <Link2 size={18} />
                <p className="font-semibold text-[var(--app-fg)]">Connect Google</p>
              </div>
              <p className="mt-2 text-sm text-[var(--app-muted)]">Adds `google_email` to this same database user.</p>
              <Button className="mt-4 w-full" disabled={busy === "google"} type="button" variant="secondary" onClick={connectGoogle}>
                <ShieldCheck size={18} />
                {busy === "google" ? "Connecting..." : "Connect Google"}
              </Button>
            </div>

            <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4">
              <div className="flex items-center gap-3">
                <Wallet size={18} />
                <p className="font-semibold text-[var(--app-fg)]">Connect Phantom</p>
              </div>
              <p className="mt-2 text-sm text-[var(--app-muted)]">Signs a nonce and updates `wallet_address` on this user.</p>
              <Button className="mt-4 w-full bg-[var(--accent)] hover:opacity-90" disabled={busy === "wallet"} type="button" onClick={connectWallet}>
                <Wallet size={18} />
                {busy === "wallet" ? "Connecting..." : "Connect Wallet"}
              </Button>
            </div>
          </div>
        </main>

        <aside className="glass-panel rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-[var(--app-fg)]">Recent users</h2>
            <Button disabled={busy === "loading"} type="button" variant="secondary" onClick={refreshUsers}>
              Refresh
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {users.map((candidate) => (
              <div key={candidate.id} className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-white">
                    <UserRound size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-[var(--app-fg)]">{candidate.email ?? candidate.walletAddress ?? candidate.id}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--app-muted)]">
                      <CalendarDays size={13} />
                      {new Date(candidate.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-[var(--app-muted)]">
                      Google {candidate.googleEmail ? "connected" : "empty"} · Wallet {candidate.walletAddress ? "connected" : "empty"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!users.length ? <p className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4 text-sm text-[var(--app-muted)]">No users loaded yet.</p> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function IdentityTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center gap-3 text-[var(--app-fg)]">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-3 break-all text-sm text-[var(--app-muted)]">{value}</p>
    </div>
  );
}
