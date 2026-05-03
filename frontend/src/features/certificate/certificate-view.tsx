"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Share2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatWallet } from "@/lib/utils";
import type { Proof } from "@/shared/schemas";

type CertificateViewProps = {
  proof: Proof;
};

export function CertificateView({ proof }: CertificateViewProps) {
  const explorerUrl = `https://explorer.solana.com/tx/${proof.solanaSignature}?cluster=devnet`;
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const stampRef = useRef<HTMLDivElement | null>(null);
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;

  useEffect(() => {
    const stamp = stampRef.current;
    if (!stamp) return;
    const timer = window.setTimeout(() => launchConfetti(stamp), 980);
    return () => window.clearTimeout(timer);
  }, []);

  async function copyField(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(label);
    window.setTimeout(() => setCopiedField((current) => (current === label ? null : current)), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Badge tone="green">Registered on Solana</Badge>
        <div ref={stampRef} className="protected-stamp mt-4">
          <ShieldCheck size={20} />
          PROTECTED
        </div>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">{proof.title}</h1>
        <p className="mt-3 text-muted">
          Public proof certificate for creator attribution. This is timestamped evidence, not a legal copyright guarantee.
        </p>
      </div>

      <Card className="space-y-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <ShieldCheck />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Proof Certificate</h2>
            <p className="text-sm text-muted">Shareable origin evidence for platforms, brands, agencies, and communities.</p>
          </div>
        </div>

        <dl className="grid gap-4 md:grid-cols-2">
          <CertificateField copied={copiedField === "Creator"} label="Creator" onCopy={copyField} value={proof.creatorHandle ?? formatWallet(proof.creatorWallet)} />
          <CertificateField copied={copiedField === "Registered"} label="Registered" onCopy={copyField} value={formatDateTime(proof.registeredAt)} />
          <CertificateField copied={copiedField === "Proof ID"} label="Proof ID" onCopy={copyField} value={proof.id} />
          <CertificateField copied={copiedField === "Creator wallet"} label="Creator wallet" onCopy={copyField} value={formatWallet(proof.creatorWallet)} />
          <CertificateField copied={copiedField === "Fingerprint root"} label="Fingerprint root" onCopy={copyField} value={proof.fingerprintRoot} wide />
          <CertificateField copied={copiedField === "SHA-256"} label="SHA-256" onCopy={copyField} value={proof.sha256} wide />
        </dl>

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            href={explorerUrl}
            rel="noreferrer"
            target="_blank"
          >
            View Transaction
            <ExternalLink size={16} />
          </a>
          <Button type="button" variant="secondary" onClick={() => setShareOpen(true)}>
            <Share2 size={16} />
            Share Certificate
          </Button>
        </div>
      </Card>
      <ShareSheet explorerUrl={explorerUrl} onClose={() => setShareOpen(false)} open={shareOpen} shareUrl={shareUrl} title={proof.title} />
    </div>
  );
}

type CertificateFieldProps = {
  copied: boolean;
  label: string;
  onCopy: (label: string, value: string) => Promise<void>;
  value: string;
  wide?: boolean;
};

function CertificateField({ copied, label, onCopy, value, wide }: CertificateFieldProps) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      <dd className="mt-1 flex gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-muted">
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

