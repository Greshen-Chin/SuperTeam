"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Connection } from "@solana/web3.js";
import { ExternalLink, Film, Share2, ShieldCheck } from "lucide-react";
import { CertificateBadge } from "@/components/CertificateBadge";
import { fetchNftByMint } from "@/utils/metaplex";
import type { VidChainNft } from "@/utils/metaplex";
import { getSolanaRpcUrl } from "@/utils/env";

export default function CertificatePage({ mintAddress }: { mintAddress: string }) {
  const connection = useMemo(() => new Connection(getSolanaRpcUrl(), "confirmed"), []);
  const [nft, setNft] = useState<VidChainNft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const stampRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const stamp = stampRef.current;
    if (!stamp || !nft) return;
    const timer = window.setTimeout(() => launchConfetti(stamp), 980);
    return () => window.clearTimeout(timer);
  }, [nft]);

  async function copyField(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(label);
    window.setTimeout(() => setCopiedField((current) => (current === label ? null : current)), 2000);
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
              <div ref={stampRef} className="protected-stamp mb-5">
                <ShieldCheck size={20} />
                PROTECTED
              </div>
              <h1 className="text-3xl font-bold text-[var(--app-fg)]">{nft.title}</h1>
              <p className="mt-3 text-[var(--app-muted)]">{nft.description}</p>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <CertificateField copied={copiedField === "Creator wallet"} label="Creator wallet" onCopy={copyField} value={nft.creatorWallet || "Tidak tersedia"} />
                <CertificateField copied={copiedField === "Waktu registrasi"} label="Waktu registrasi" onCopy={copyField} value={nft.registeredAt ? new Date(nft.registeredAt).toLocaleString("id-ID") : "Tidak tersedia"} />
                <CertificateField copied={copiedField === "Mint address"} label="Mint address" onCopy={copyField} value={nft.mintAddress} />
                <CertificateField copied={copiedField === "SHA-256"} label="SHA-256" onCopy={copyField} value={nft.sha256 || "Tidak tersedia"} />
                <CertificateField copied={copiedField === "pHash fingerprint"} label="pHash fingerprint" onCopy={copyField} value={nft.phash || "Tidak tersedia"} />
                <CertificateField copied={copiedField === "IPFS video"} label="IPFS video" onCopy={copyField} value={nft.ipfsVideo || "Tidak tersedia"} />
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white" href={explorerUrl} rel="noreferrer" target="_blank">
                  <ExternalLink size={17} />
                  Buka Solana Explorer
                </a>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--app-line)] px-4 text-sm font-semibold text-[var(--app-fg)]" type="button" onClick={() => setShareOpen(true)}>
                  <Share2 size={17} />
                  Share Proof
                </button>
              </div>
            </div>
          </section>
        ) : null}
        {nft ? <ShareSheet explorerUrl={explorerUrl} onClose={() => setShareOpen(false)} open={shareOpen} shareUrl={shareUrl} title={nft.title} /> : null}
      </main>
    </div>
  );
}

function CertificateField({ copied, label, onCopy, value }: { copied: boolean; label: string; onCopy: (label: string, value: string) => Promise<void>; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-[var(--app-fg)]">{label}</dt>
      <dd className="mt-1 flex gap-2 rounded-lg bg-[var(--app-bg-soft)] px-3 py-2 text-sm text-[var(--app-muted)]">
        <span className="min-w-0 flex-1 break-all">{value}</span>
        <button className="copy-field-btn" type="button" onClick={() => void onCopy(label, value)}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </dd>
    </div>
  );
}

function ShareSheet({ explorerUrl, onClose, open, shareUrl, title }: { explorerUrl: string; onClose: () => void; open: boolean; shareUrl: string; title: string }) {
  if (!open) return null;
  return (
    <div className="share-sheet-backdrop" onMouseDown={onClose}>
      <div className="share-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="share-sheet-handle" />
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-200">Share proof</p>
        <h3 className="mt-3 text-2xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">Send this public certificate to platforms, brands, agencies, or communities.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a className="share-sheet-action" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Verified proof for ${title}`)}&url=${encodeURIComponent(shareUrl)}`} rel="noreferrer" target="_blank">Post to X</a>
          <a className="share-sheet-action" href={`mailto:?subject=${encodeURIComponent(`VidChain proof: ${title}`)}&body=${encodeURIComponent(shareUrl)}`}>Email proof</a>
          <a className="share-sheet-action" href={explorerUrl} rel="noreferrer" target="_blank">Open Explorer</a>
          <button className="share-sheet-action" type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)}>Copy link</button>
        </div>
      </div>
    </div>
  );
}

function launchConfetti(originEl: HTMLElement) {
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ["#9945FF", "#14F195", "#FF6B6B", "#FFB347", "#4E9BFF", "#FF6BFF"];

  for (let index = 0; index < 60; index += 1) {
    const particle = document.createElement("div");
    const isRect = Math.random() > 0.5;
    const color = colors[Math.floor(Math.random() * colors.length)] ?? "#14F195";
    const width = isRect ? 4 + Math.random() * 4 : 6 + Math.random() * 6;
    const height = isRect ? 8 + Math.random() * 8 : width;
    particle.className = "proof-confetti";
    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;
    particle.style.width = `${width}px`;
    particle.style.height = `${height}px`;
    particle.style.background = color;
    particle.style.borderRadius = isRect ? "2px" : "50%";
    particle.style.boxShadow = `0 0 6px ${color}`;
    document.body.appendChild(particle);

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
    const speed = 200 + Math.random() * 300;
    const x = Math.cos(angle) * speed * 0.8;
    const y = Math.sin(angle) * speed * 0.8 + 200;
    particle.animate(
      [
        { opacity: 1, transform: "translate3d(0,0,0) rotate(0deg)" },
        { opacity: 0, transform: `translate3d(${x}px,${y}px,0) rotate(${Math.random() * 720 - 360}deg)` }
      ],
      { duration: 1200 + Math.random() * 800, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" }
    ).onfinish = () => particle.remove();
  }
}
