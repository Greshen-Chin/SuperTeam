"use client";

import { useEffect, useMemo, useState } from "react";
import { Connection } from "@solana/web3.js";
import { Copy, ExternalLink, Film } from "lucide-react";
import { CertificateBadge } from "@/components/CertificateBadge";
import { fetchNftByMint } from "@/utils/metaplex";
import type { VidChainNft } from "@/utils/metaplex";
import { getSolanaRpcUrl } from "@/utils/env";

export default function CertificatePage({ mintAddress }: { mintAddress: string }) {
  const connection = useMemo(() => new Connection(getSolanaRpcUrl(), "confirmed"), []);
  const [nft, setNft] = useState<VidChainNft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCertificate() {
      try {
        setIsLoading(true);
        setError(null);
        const nextNft = await fetchNftByMint(connection, mintAddress);
        if (!cancelled) setNft(nextNft);
      } catch {
        if (!cancelled) setError("Sertifikat belum bisa dimuat. Periksa alamat mint dan coba lagi.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCertificate();

    return () => {
      cancelled = true;
    };
  }, [connection, mintAddress]);

  const explorerUrl = `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`;
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--app-bg)] px-4 py-8">
      <main className="mx-auto max-w-4xl">
        <CertificateBadge />
        {isLoading ? <p className="mt-6 text-[var(--app-muted)]">Memuat sertifikat...</p> : null}
        {error ? <p className="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
        {!isLoading && !nft ? <p className="mt-6 text-[var(--app-muted)]">Sertifikat tidak ditemukan di Solana Devnet.</p> : null}

        {nft ? (
          <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)]">
            <div className="grid aspect-video place-items-center bg-[var(--app-bg-soft)]">
              {nft.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={nft.title} className="h-full w-full object-cover" src={nft.thumbnail} />
              ) : (
                <Film className="text-[var(--app-muted)]" size={56} />
              )}
            </div>
            <div className="p-6">
              <h1 className="text-3xl font-bold text-[var(--app-fg)]">{nft.title}</h1>
              <p className="mt-3 text-[var(--app-muted)]">{nft.description}</p>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <CertificateField label="Creator wallet" value={nft.creatorWallet || "Tidak tersedia"} />
                <CertificateField label="Waktu registrasi" value={nft.registeredAt ? new Date(nft.registeredAt).toLocaleString("id-ID") : "Tidak tersedia"} />
                <CertificateField label="Mint address" value={nft.mintAddress} />
                <CertificateField label="SHA-256" value={nft.sha256 || "Tidak tersedia"} />
                <CertificateField label="pHash fingerprint" value={nft.phash || "Tidak tersedia"} />
                <CertificateField label="IPFS video" value={nft.ipfsVideo || "Tidak tersedia"} />
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white" href={explorerUrl} rel="noreferrer" target="_blank">
                  <ExternalLink size={17} />
                  Buka Solana Explorer
                </a>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--app-line)] px-4 text-sm font-semibold text-[var(--app-fg)]" type="button" onClick={copyShareUrl}>
                  <Copy size={17} />
                  Salin link sertifikat
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function CertificateField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-[var(--app-fg)]">{label}</dt>
      <dd className="mt-1 break-all rounded-lg bg-[var(--app-bg-soft)] px-3 py-2 text-sm text-[var(--app-muted)]">{value}</dd>
    </div>
  );
}
