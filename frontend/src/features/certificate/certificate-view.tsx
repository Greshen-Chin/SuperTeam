"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, ExternalLink, FileText, Link2, Loader2, Share2, ShieldCheck, Tag, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileModal } from "@/features/profile/profile-modal";
import { useCreatorProfile } from "@/lib/use-creator-profile";
import { useAuth } from "@/context/AuthContext";
import { downloadProofReport } from "@/lib/pdf-report";
import { payForLicense } from "@/lib/blockchain-adapter";
import { apiClient } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { formatDateTime, formatWallet } from "@/lib/utils";
import type { License, Proof } from "@/shared/schemas";

const PLATFORM_FEE_BPS = 500;

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toFixed(3).replace(/\.?0+$/, "");
}

type CertificateViewProps = {
  proof: Proof;
};

export function CertificateView({ proof }: CertificateViewProps) {
  const explorerUrl = `https://explorer.solana.com/tx/${proof.solanaSignature}?cluster=devnet`;
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const stampRef = useRef<HTMLDivElement | null>(null);
  const shareUrl = typeof window === "undefined" ? "" : window.location.href;
  const { profile, hasName } = useCreatorProfile();
  const { publicAddress } = useAuth();

  const isCreator = !!publicAddress && publicAddress === proof.creatorWallet;
  const isForSale = proof.licenseFeeLamports > 0;

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
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green">Registered on Solana</Badge>
          {isForSale && (
            <span className="cert-license-badge">
              <Tag size={11} />
              Available for licensing · ◎ {lamportsToSol(proof.licenseFeeLamports)} SOL
            </span>
          )}
        </div>
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

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:flex-wrap">
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
          <Button type="button" variant="secondary" onClick={() => setDownloadOpen(true)}>
            <Download size={16} />
            Download Report PDF
          </Button>
          {isForSale && !isCreator && (
            <button className="cert-buy-btn" type="button" onClick={() => setBuyOpen(true)}>
              <Tag size={15} />
              Buy License · ◎ {lamportsToSol(proof.licenseFeeLamports)}
            </button>
          )}
          {isForSale && isCreator && (
            <Link className="cert-manage-link" href={routes.market}>
              <Tag size={14} />
              Manage listing
            </Link>
          )}
        </div>
      </Card>

      {/* Download Report Panel */}
      <DownloadReportPanel
        open={downloadOpen}
        proof={proof}
        channelName={profile.channelName}
        platformUrl={profile.platformUrl}
        hasProfile={hasName}
        onClose={() => setDownloadOpen(false)}
        onOpenProfile={() => { setDownloadOpen(false); setProfileOpen(true); }}
      />

      <ShareSheet explorerUrl={explorerUrl} onClose={() => setShareOpen(false)} open={shareOpen} shareUrl={shareUrl} title={proof.title} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <BuyLicensePanel
        open={buyOpen}
        proof={proof}
        buyerWallet={publicAddress ?? ""}
        onClose={() => setBuyOpen(false)}
      />
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

// ─── Download Report Panel ────────────────────────────────────────────────────

type DownloadReportPanelProps = {
  open: boolean;
  proof: Proof;
  channelName: string;
  platformUrl: string;
  hasProfile: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
};

function DownloadReportPanel({
  open, proof, channelName, platformUrl, hasProfile, onClose, onOpenProfile
}: DownloadReportPanelProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  // Restore saved URL for this proof
  useEffect(() => {
    if (!open) return;
    const saved = typeof window !== "undefined"
      ? localStorage.getItem(`vidchain_proof_url_${proof.id}`) ?? ""
      : "";
    setVideoUrl(saved);
    setDone(false);
  }, [open, proof.id]);

  async function handleGenerate() {
    if (videoUrl) {
      try { localStorage.setItem(`vidchain_proof_url_${proof.id}`, videoUrl); } catch { /* ignore */ }
    }
    setGenerating(true);
    try {
      await downloadProofReport({ proof, channelName, platformUrl, originalVideoUrl: videoUrl || undefined });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch {
      // silently fail — jsPDF errors are rare
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="share-sheet-backdrop" onMouseDown={onClose}>
      <div className="share-sheet report-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="share-sheet-handle" />

        <div className="report-panel-header">
          <FileText size={20} />
          <div>
            <h3>Download Copyright Report</h3>
            <p>A PDF certificate you can submit to YouTube, TikTok, Instagram, or any platform.</p>
          </div>
        </div>

        {/* Profile prompt if no channel name */}
        {!hasProfile ? (
          <div className="report-profile-prompt">
            <User size={16} />
            <div>
              <strong>Set your channel name first</strong>
              <small>Your name appears on the report as the rights holder.</small>
            </div>
            <button className="report-profile-btn" type="button" onClick={onOpenProfile}>
              Set up profile
            </button>
          </div>
        ) : (
          <div className="report-profile-filled">
            <User size={14} />
            <span>Reporting as <strong>{channelName}</strong></span>
            <button className="report-change-btn" type="button" onClick={onOpenProfile}>Change</button>
          </div>
        )}

        {/* Video URL input */}
        <div className="report-url-section">
          <label className="report-url-label">
            <Link2 size={14} />
            Where did you originally post this video?
            <em>optional — included in the report</em>
          </label>
          <input
            className="report-url-input"
            placeholder="e.g. https://www.youtube.com/watch?v=xxxxx"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <p className="report-url-hint">
            Paste the YouTube, TikTok, Instagram, or Bigo Live URL where you first published this video.
            This strengthens your copyright report.
          </p>
        </div>

        {/* What's included preview */}
        <div className="report-includes">
          <p className="report-includes-title">Report includes:</p>
          <div className="report-includes-grid">
            {[
              "Your channel name & wallet",
              "Video title & registration date",
              "Solana transaction signature",
              "SHA-256 cryptographic hash",
              "Fingerprint root proof",
              "Good faith declaration",
            ].map((item) => (
              <div className="report-include-item" key={item}>
                <ShieldCheck size={12} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <button
          className="report-download-btn"
          disabled={!hasProfile || generating}
          type="button"
          onClick={handleGenerate}
        >
          {generating ? (
            <><Loader2 size={16} className="report-spinner" />Generating PDF…</>
          ) : done ? (
            <><ShieldCheck size={16} />Downloaded!</>
          ) : (
            <><Download size={16} />Generate & Download PDF</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Buy License Panel ────────────────────────────────────────────────────────

type BuyLicensePanelProps = {
  open: boolean;
  proof: Proof;
  buyerWallet: string;
  onClose: () => void;
};

type BuyStep = "confirm" | "paying" | "done" | "error";

function BuyLicensePanel({ open, proof, buyerWallet, onClose }: BuyLicensePanelProps) {
  const [step, setStep] = useState<BuyStep>("confirm");
  const [license, setLicense] = useState<License | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) { setStep("confirm"); setLicense(null); setErrorMsg(""); }
  }, [open]);

  if (!open) return null;

  const feeLamports = proof.licenseFeeLamports;
  const platformFee = Math.floor((feeLamports * PLATFORM_FEE_BPS) / 10_000);
  const creatorAmount = feeLamports - platformFee;

  async function handlePay() {
    if (!buyerWallet) { setErrorMsg("Connect your wallet first."); setStep("error"); return; }
    setStep("paying");
    try {
      const { signature } = await payForLicense({
        proofId: proof.id,
        buyerWallet,
        sellerWallet: proof.creatorWallet,
        feeLamports
      });
      const created = await apiClient.createLicense({
        proofId: proof.id,
        buyerWallet,
        feeLamports,
        solanaSignature: signature
      });
      setLicense(created);
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setStep("error");
    }
  }

  return (
    <div className="share-sheet-backdrop" onMouseDown={onClose}>
      <div className="share-sheet buy-license-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="share-sheet-handle" />

        {/* Header */}
        <div className="buy-panel-header">
          <Tag size={18} />
          <div>
            <h3>Buy a License</h3>
            <p>Get a blockchain-verified right to use this content commercially.</p>
          </div>
        </div>

        {step === "confirm" && (
          <>
            {/* Video info */}
            <div className="buy-panel-video">
              <ShieldCheck size={14} className="buy-panel-shield" />
              <span>{proof.title}</span>
            </div>

            {/* Price breakdown */}
            <div className="buy-panel-breakdown">
              <div className="buy-breakdown-row">
                <span>License price</span>
                <strong>◎ {lamportsToSol(feeLamports)} SOL</strong>
              </div>
              <div className="buy-breakdown-row">
                <span>Creator receives (95%)</span>
                <span className="buy-breakdown-creator">◎ {lamportsToSol(creatorAmount)} SOL</span>
              </div>
              <div className="buy-breakdown-row">
                <span>VidChain fee (5%)</span>
                <span className="buy-breakdown-fee">◎ {lamportsToSol(platformFee)} SOL</span>
              </div>
            </div>

            {/* What you get */}
            <div className="buy-panel-includes">
              <p className="buy-includes-title">Your license includes:</p>
              <div className="buy-includes-grid">
                {[
                  "Blockchain-verified usage certificate",
                  "On-chain proof of legitimate purchase",
                  "Downloadable license PDF",
                  "Public certificate URL to share with platforms",
                ].map((item) => (
                  <div className="buy-include-item" key={item}>
                    <Check size={11} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {!buyerWallet && (
              <p className="buy-panel-warn">Connect your wallet before purchasing.</p>
            )}

            <button
              className="buy-confirm-btn"
              disabled={!buyerWallet}
              type="button"
              onClick={handlePay}
            >
              <Tag size={15} />
              Confirm &amp; Pay ◎ {lamportsToSol(feeLamports)} SOL
            </button>
          </>
        )}

        {step === "paying" && (
          <div className="buy-panel-state">
            <Loader2 size={28} className="buy-state-spinner" />
            <p className="buy-state-title">Processing payment…</p>
            <p className="buy-state-sub">Sending to Solana · do not close this window.</p>
          </div>
        )}

        {step === "done" && license && (
          <div className="buy-panel-state">
            <div className="buy-done-icon">
              <Check size={20} />
            </div>
            <p className="buy-state-title">License purchased!</p>
            <p className="buy-state-sub">Your blockchain-verified certificate is ready.</p>
            <Link
              className="buy-view-cert-btn"
              href={routes.license(license.id)}
              onClick={onClose}
            >
              View your license certificate
              <ExternalLink size={13} />
            </Link>
          </div>
        )}

        {step === "error" && (
          <div className="buy-panel-state">
            <p className="buy-state-title buy-state-error">Payment failed</p>
            <p className="buy-state-sub">{errorMsg}</p>
            <button className="buy-retry-btn" type="button" onClick={() => setStep("confirm")}>
              Try again
            </button>
          </div>
        )}
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

