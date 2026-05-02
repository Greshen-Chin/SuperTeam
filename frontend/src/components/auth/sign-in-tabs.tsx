"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useVidchainWallet } from "@/lib/use-vidchain-wallet";
import { useWeb3Auth } from "@/components/providers/web3auth-provider";

export function SignInTabs() {
  const { loginWithGoogle, loginWithEmail, connecting } = useVidchainWallet();
  const { configured, initError, ready } = useWeb3Auth();

  if (!configured) {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Web3Auth belum dikonfigurasi. Tambahkan{" "}
          <code className="rounded bg-yellow-500/20 px-1">NEXT_PUBLIC_WEB3AUTH_CLIENT_ID</code> ke{" "}
          <code className="rounded bg-yellow-500/20 px-1">.env.local</code>.
        </p>
        <div className="flex items-center gap-3 text-xs text-[var(--app-muted)]">
          <div className="h-px flex-1 bg-[var(--app-line)]" />
          sudah punya wallet?
          <div className="h-px flex-1 bg-[var(--app-line)]" />
        </div>
        <WalletMultiButton className="!w-full !h-12 !rounded-xl !bg-zinc-900" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Web3Auth gagal inisialisasi: {initError}
        </p>
        <p className="text-xs text-[var(--app-muted)]">
          Pastikan domain <code>localhost:3000</code> sudah di-whitelist di{" "}
          <a className="underline" href="https://dashboard.web3auth.io" target="_blank" rel="noreferrer">
            dashboard.web3auth.io
          </a>
        </p>
        <WalletMultiButton className="!w-full !h-12 !rounded-xl !bg-zinc-900" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <p className="text-sm text-[var(--app-muted)]">Memuat Web3Auth...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <button
        data-testid="signin-google"
        disabled={connecting}
        type="button"
        onClick={() => void loginWithGoogle()}
        className="flex w-full h-12 items-center justify-center gap-3 rounded-xl border border-[var(--app-line)] bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 text-sm font-semibold transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Lanjut dengan Google
      </button>

      <button
        data-testid="signin-email"
        disabled={connecting}
        type="button"
        onClick={() => void loginWithEmail()}
        className="flex w-full h-12 items-center justify-center gap-3 rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--app-fg)] hover:bg-[var(--app-line)] disabled:opacity-50 text-sm font-semibold transition-colors"
      >
        Lanjut dengan Email
      </button>

      <div className="flex items-center gap-3 text-xs text-[var(--app-muted)]">
        <div className="h-px flex-1 bg-[var(--app-line)]" />
        sudah punya wallet?
        <div className="h-px flex-1 bg-[var(--app-line)]" />
      </div>

      <WalletMultiButton
        data-testid="signin-wallet"
        className="!w-full !h-12 !rounded-xl !bg-zinc-900"
      />
    </div>
  );
}
