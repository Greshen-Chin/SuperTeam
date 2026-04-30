"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { WalletAddress } from "@/components/WalletAddress";
import { NFTCard } from "@/components/NFTCard";
import { useAuth } from "@/context/AuthContext";
import { useWalletData } from "@/context/WalletContext";
import { routes } from "@/lib/routes";

export default function WalletPage() {
  const { isLoggedIn, publicAddress, user, loginWithGoogle, isLoading: isAuthLoading } = useAuth();
  const { balanceSol, nfts, isLoading, error, refreshWallet } = useWalletData();

  if (!isLoggedIn || !publicAddress) {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center px-4 text-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--app-fg)]">Wallet belum aktif</h1>
          <p className="mt-3 text-[var(--app-muted)]">Masuk dengan Google dulu agar VidChain membuat wallet Solana untukmu.</p>
          <button className="mt-6 h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white" disabled={isAuthLoading} type="button" onClick={loginWithGoogle}>
            Lanjut dengan Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--app-bg)] px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Wallet VidChain</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--app-fg)]">Halo, {user?.name || "kreator"}</h1>
            <p className="mt-2 text-[var(--app-muted)]">Ini alamat wallet Solana Devnet yang dibuat dari login Google kamu.</p>
          </div>
          <Link className="text-sm font-semibold text-[#2f81f7]" href={routes.home}>
            Kembali
          </Link>
        </div>

        <div className="mt-6">
          <WalletAddress address={publicAddress} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-5">
            <p className="text-sm text-[var(--app-muted)]">Saldo Devnet</p>
            <p className="mt-1 text-3xl font-bold text-[var(--app-fg)]">{balanceSol == null ? "-" : balanceSol.toFixed(4)} SOL</p>
          </div>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--app-line)] px-4 text-sm font-semibold text-[var(--app-fg)]" disabled={isLoading} type="button" onClick={refreshWallet}>
            <RefreshCw size={17} />
            {isLoading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        {error ? <p className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-[var(--app-fg)]">Video terdaftar</h2>
          <p className="mt-2 text-sm text-[var(--app-muted)]">NFT video dari wallet ini akan muncul di sini.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nfts.map((nft) => (
              <NFTCard key={nft.mintAddress} nft={nft} />
            ))}
          </div>
          {!isLoading && !nfts.length ? (
            <div className="mt-5 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-6 text-sm text-[var(--app-muted)]">
              Belum ada video NFT di wallet ini.
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
