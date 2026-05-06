"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, FileVideo, HardDrive, Layers3, LockKeyhole, Search, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { ConfidenceMeter } from "@/components/proof/confidence-meter";
import { ProofStatusBadge } from "@/components/proof/proof-status-badge";
import { routes } from "@/lib/routes";
import { useVerifyVideoFlow } from "@/features/verify/use-verify-video-flow";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import type { Proof } from "@/shared/schemas";

const TONES = ["purple", "mint", "amber", "blue", "pink"] as const;
const SparklesCore = dynamic(
  () => import("@/components/ui/sparkles").then((mod) => mod.SparklesCore),
  { ssr: false }
);

export function CheckPageView() {
  const flow = useVerifyVideoFlow();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [shouldVerify, setShouldVerify] = useState(false);

  const isBusy = flow.state === "fingerprinting" || flow.state === "checking";
  const hasResult = flow.state === "match_found" || flow.state === "no_match";

  useEffect(() => {
    if (!shouldVerify || !flow.file) return;
    setShouldVerify(false);
    void flow.verify();
  }, [flow, shouldVerify]);

  const handleFile = (file: File | null) => {
    if (!file || isBusy) return;
    flow.selectFile(file);
    setShouldVerify(true);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <div
      className={isDragging ? "vid-upload-page check-upload-page drag-active" : "vid-upload-page check-upload-page"}
      onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <StorageCursor variant="check" />
      <div className="storage-wallpaper-rails" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="upload-blob upload-blob-one" />
      <div className="upload-blob upload-blob-two" />
      <div className="upload-blob upload-blob-three" />

      <section className="upload-shell">
        <div className="upload-sparkles-field" aria-hidden>
          <SparklesCore
            background="transparent"
            minSize={0.35}
            maxSize={1.2}
            particleDensity={90}
            className="h-full w-full"
            particleColor="#14F195"
            speed={1.2}
          />
        </div>

        <div className="upload-state-stage">
          <div className="upload-idle-state">
            <p className="upload-kicker">VIDCHAIN CHECK</p>
            <h1>Drop a copy.<br />Find the origin.</h1>
            <p className="upload-subcopy">Upload a repost or edit. VidChain compares fingerprints and returns the closest proof.</p>

            <button
              className={isDragging ? "vault-portal check-portal drag-over" : "vault-portal check-portal"}
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
              aria-label="Upload a video to check"
            >
              <span className="vault-ring vault-ring-one" />
              <span className="vault-ring vault-ring-two" />
              <span className="vault-ring vault-ring-three" />
              <span className="portal-ripple portal-ripple-one" />
              <span className="portal-ripple portal-ripple-two" />
              <span className="vault-orb vault-orb-one" />
              <span className="vault-orb vault-orb-two" />
              <span className="vault-orb vault-orb-three" />
              <span className="vault-orb vault-orb-four" />
              <span className="vault-orb vault-orb-five" />
              <span className="vault-core">
                <Search size={42} />
              </span>
            </button>

            <p className="upload-hint">{isBusy ? "checking fingerprint..." : "click to check - or drag file here"}</p>
            <div className="file-type-pills">
              {["MP4", "MOV", "AVI", "MKV", "WEBM"].map((type) => <span key={type}>{type}</span>)}
            </div>

            {flow.file ? (
              <div className="check-file-status">
                <FileVideo size={16} />
                <span>{flow.file.name}</span>
              </div>
            ) : null}

            {isBusy ? (
              <div className="check-result-strip active">
                <Search size={16} />
                <span>Scanning SHA-256 + pHash + registry</span>
              </div>
            ) : null}

            {flow.error ? (
              <div className="check-result-strip error">
                <XCircle size={16} />
                <span>{flow.error}</span>
              </div>
            ) : null}

            {hasResult && flow.result ? (
              <div className="check-result-card">
                <div className="check-result-title">
                  {flow.result.matchType === "none" ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                  <strong>{flow.result.matchType === "none" ? "No known origin" : "Likely origin found"}</strong>
                </div>
                <ProofStatusBadge matchType={flow.result.matchType} />
                <ConfidenceMeter value={flow.result.confidence} />
                {flow.result.certificateUrl ? (
                  <Link className="check-certificate-link" href={flow.result.certificateUrl}>
                    Open certificate
                    <ArrowRight size={14} />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <input
        ref={inputRef}
        accept="video/*"
        className="hidden"
        type="file"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export function NftStorageView() {
  const { publicAddress, isLoggedIn } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicAddress) return;
    setLoading(true);
    apiClient.listProofs(publicAddress, { limit: 3 })
      .then(({ proofs: items }) => setProofs(items))
      .catch(() => setProofs([]))
      .finally(() => setLoading(false));
  }, [publicAddress]);

  const displayItems = proofs.length > 0
    ? proofs.slice(0, 3)
    : null;

  return (
    <StorageShell
      eyebrow="PROOF VAULT"
      title="Proofs stacked clean."
      icon={<Layers3 size={28} />}
      cta="Open vault"
      href={routes.collection}
      variant="nft"
    >
      <div className="storage-card-grid proof-stack-hook action-hook" aria-label="Proof vault">
        {loading ? (
          <div className="mini-proof-card purple" style={{ opacity: 0.5 }}>
            <ShieldCheck size={26} />
            <strong>Loading...</strong>
            <span>fetching proofs</span>
          </div>
        ) : displayItems ? (
          displayItems.map((proof, index) => (
            <Link
              className={`mini-proof-card ${TONES[index % TONES.length]}`}
              href={routes.certificate(proof.id)}
              key={proof.id}
            >
              <ShieldCheck size={26} />
              <strong>{proof.title}</strong>
              <span>{proof.id.slice(0, 14)}…</span>
            </Link>
          ))
        ) : (
          <Link className="mini-proof-card purple" href={routes.register}>
            <ShieldCheck size={26} />
            <strong>{isLoggedIn ? "No proofs yet" : "Connect wallet"}</strong>
            <span>{isLoggedIn ? "Upload your first file" : "to view proofs"}</span>
          </Link>
        )}
        <span className="hook-caption proof-hook-caption">open / inspect</span>
      </div>
    </StorageShell>
  );
}

export function VideoStorageView() {
  const { publicAddress, isLoggedIn } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);

  useEffect(() => {
    if (!publicAddress) return;
    apiClient.listProofs(publicAddress, { limit: 10 })
      .then(({ proofs: items }) => setProofs(items))
      .catch(() => setProofs([]));
  }, [publicAddress]);

  return (
    <StorageShell
      eyebrow="VIDEO VAULT"
      title="Secured originals."
      icon={<HardDrive size={28} />}
      cta="Upload"
      href={routes.register}
      variant="video"
    >
      <div className="vault-room">
        <section className="vault-core-panel" aria-label="Vault status">
          <div className="vault-status-bar">
            <span>
              <LockKeyhole size={14} />
              Vault sealed
            </span>
            <strong>{proofs.length.toString().padStart(2, "0")} assets</strong>
          </div>
          <div className="vault-door" aria-hidden>
            <span className="vault-door-rim" />
            <span className="vault-door-ring vault-door-ring-one" />
            <span className="vault-door-ring vault-door-ring-two" />
            <span className="vault-spokes" />
            <span className="vault-lock-core">
              <LockKeyhole size={28} />
            </span>
            <span className="vault-door-label">Owner-only archive</span>
          </div>
          <Link className="vault-deposit-link" href={routes.register}>
            <UploadCloud size={16} />
            Deposit new original
          </Link>
        </section>

        <section className="vault-inventory" aria-label="Vault inventory">
          <div className="vault-inventory-heading">
            <span>Stored originals</span>
            <i />
          </div>
          <div className="vault-ledger">
            {proofs.length > 0 ? (
              proofs.map((proof, index) => (
                <Link className="video-storage-row vault-asset-row" href={routes.certificate(proof.id)} key={proof.id}>
                  <span className="vault-slot-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="video-storage-icon">
                    <FileVideo size={18} />
                  </span>
                  <div>
                    <strong>{proof.title}</strong>
                    <small>{new Date(proof.registeredAt).toLocaleDateString()}</small>
                  </div>
                  <em>Sealed</em>
                </Link>
              ))
            ) : (
              <Link className="video-storage-row vault-asset-row empty" href={isLoggedIn ? routes.register : routes.login}>
                <span className="vault-slot-index">01</span>
                <span className="video-storage-icon">
                  <FileVideo size={18} />
                </span>
                <div>
                  <strong>{isLoggedIn ? "No originals stored" : "Vault locked"}</strong>
                  <small>{isLoggedIn ? "deposit your first protected file" : "connect wallet to unlock inventory"}</small>
                </div>
                <em>{isLoggedIn ? "Empty" : "Locked"}</em>
              </Link>
            )}
          </div>
        </section>
      </div>
    </StorageShell>
  );
}

function StorageShell({
  eyebrow,
  title,
  icon,
  cta,
  href,
  variant,
  children
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  cta: string;
  href: string;
  variant: "check" | "nft" | "video";
  children: ReactNode;
}) {
  return (
    <main className={`storage-page-shell storage-${variant}`}>
      <StorageCursor variant={variant} />
      <div className="storage-wallpaper-rails" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <SparklesCore
        background="transparent"
        minSize={0.4}
        maxSize={1.3}
        particleDensity={85}
        className="storage-sparkles"
        particleColor="#FFFFFF"
        speed={0.8}
      />
      <section className="storage-hero-card">
        <div className="storage-hero-copy">
          <span className="storage-icon">{icon}</span>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <Link className="storage-cta" href={href}>
            {cta}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="storage-visual">
          {children}
        </div>
      </section>
    </main>
  );
}

function StorageCursor({ variant }: { variant: "check" | "nft" | "video" }) {
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [trail, setTrail] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [clicks, setClicks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const idRef = useRef(0);
  const trailIdRef = useRef(0);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      setReady(true);
      setPoint({ x: event.clientX, y: event.clientY });
      const id = trailIdRef.current + 1;
      trailIdRef.current = id;
      setTrail((current) => [...current.slice(-14), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => {
        setTrail((current) => current.filter((item) => item.id !== id));
      }, 720);
    };
    const click = (event: MouseEvent) => {
      const id = idRef.current + 1;
      idRef.current = id;
      setClicks((current) => [...current.slice(-5), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => {
        setClicks((current) => current.filter((item) => item.id !== id));
      }, 900);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, []);

  return (
    <>
      <div className={ready ? `storage-cursor storage-cursor-${variant} ready` : `storage-cursor storage-cursor-${variant}`} style={{ transform: `translate3d(${point.x - 22}px, ${point.y - 22}px, 0)` }} />
      <div className={ready ? `storage-cursor-wash storage-cursor-wash-${variant} ready` : `storage-cursor-wash storage-cursor-wash-${variant}`} style={{ transform: `translate3d(${point.x - 180}px, ${point.y - 180}px, 0)` }} />
      <div className={ready ? `storage-cursor-core storage-cursor-core-${variant} ready` : `storage-cursor-core storage-cursor-core-${variant}`} style={{ transform: `translate3d(${point.x - 5}px, ${point.y - 5}px, 0)` }} />
      {trail.map((item, index) => (
        <span className={`storage-trail storage-trail-${variant}`} key={item.id} style={{ left: item.x, opacity: (index + 1) / 16, top: item.y }} />
      ))}
      {clicks.map((click) => (
        <div className={`storage-click storage-click-${variant}`} key={click.id} style={{ left: click.x, top: click.y }}>
          {Array.from({ length: variant === "video" ? 6 : 10 }, (_, index) => <span key={index} style={{ "--burst-angle": `${index * (variant === "video" ? 60 : 36)}deg` } as CSSProperties} />)}
        </div>
      ))}
    </>
  );
}
