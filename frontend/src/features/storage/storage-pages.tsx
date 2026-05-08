"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DragEvent } from "react";
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
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    apiClient.listProofs(publicAddress, { limit: 3, signal: controller.signal })
      .then(({ proofs: items }) => {
        if (active) setProofs(items);
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setProofs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
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
    const controller = new AbortController();
    let active = true;
    apiClient.listProofs(publicAddress, { limit: 10, signal: controller.signal })
      .then(({ proofs: items }) => {
        if (active) setProofs(items);
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setProofs([]);
      });
    return () => {
      active = false;
      controller.abort();
    };
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
      {variant === "video" ? (
        <>
          <PageParticleCanvas variant="vault" />
          <div className="vault-energy-orbs" aria-hidden>
            <span className="vault-energy-orb vault-energy-orb-1" />
            <span className="vault-energy-orb vault-energy-orb-2" />
            <span className="vault-energy-orb vault-energy-orb-3" />
            <span className="vault-energy-orb vault-energy-orb-4" />
            <span className="vault-energy-orb vault-energy-orb-5" />
          </div>
          <div className="vault-light-beams" aria-hidden />
        </>
      ) : null}
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

function PageParticleCanvas({ variant }: { variant: "vault" | "market" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const colors = variant === "vault"
      ? ["20,241,149", "0,229,204", "134,239,172", "78,155,255"]
      : ["255,179,71", "255,153,69", "252,211,77", "255,107,107"];
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let animation = 0;

    const particles = Array.from({ length: 62 }, () => {
      const color = colors[Math.floor(Math.random() * colors.length)] ?? colors[0];
      return {
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        color,
        opacity: 0.08 + Math.random() * 0.18,
        size: 0.6 + Math.random() * 1.8
      };
    });

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.offsetWidth || window.innerWidth;
      height = canvas.offsetHeight || window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const move = (event: MouseEvent) => { mouse.x = event.clientX; mouse.y = event.clientY; };
    const leave = () => { mouse.x = -9999; mouse.y = -9999; };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const px = particle.x * width;
        const py = particle.y * height;
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < 120) {
          const force = ((120 - distance) / 120) * 0.42;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }
        particle.vx += (0.5 - particle.x) * 0.0001 * width;
        particle.vy += (0.5 - particle.y) * 0.0001 * height;
        particle.vx *= 0.965;
        particle.vy *= 0.965;
        particle.x = Math.min(1, Math.max(0, particle.x + particle.vx / width));
        particle.y = Math.min(1, Math.max(0, particle.y + particle.vy / height));
        context.beginPath();
        context.fillStyle = `rgba(${particle.color},${particle.opacity})`;
        context.arc(particle.x * width, particle.y * height, particle.size, 0, Math.PI * 2);
        context.fill();
      });
      animation = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseleave", leave);
    return () => {
      window.cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, [variant]);

  return <canvas className={`${variant}-particle-canvas page-energy-canvas`} ref={canvasRef} aria-hidden />;
}

function StorageCursor({ variant }: { variant: "check" | "nft" | "video" }) {
  const [mounted, setMounted] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const washRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let animation = 0;
    let lastTrail = 0;
    let targetX = 0;
    let targetY = 0;

    const draw = () => {
      cursorRef.current?.style.setProperty("transform", `translate3d(${targetX - 22}px, ${targetY - 22}px, 0)`);
      washRef.current?.style.setProperty("transform", `translate3d(${targetX - 180}px, ${targetY - 180}px, 0)`);
      coreRef.current?.style.setProperty("transform", `translate3d(${targetX - 5}px, ${targetY - 5}px, 0)`);
      animation = 0;
    };

    const scheduleDraw = () => {
      if (animation === 0) animation = window.requestAnimationFrame(draw);
    };

    const addTrail = (x: number, y: number) => {
      const now = performance.now();
      if (now - lastTrail < 36) return;
      lastTrail = now;
      const trail = document.createElement("span");
      trail.className = `storage-trail storage-trail-${variant}`;
      trail.style.left = `${x}px`;
      trail.style.top = `${y}px`;
      trail.style.opacity = "0.8";
      document.body.appendChild(trail);
      window.setTimeout(() => trail.remove(), 720);
    };

    const move = (event: MouseEvent) => {
      if (!readyRef.current) {
        readyRef.current = true;
        cursorRef.current?.classList.add("ready");
        washRef.current?.classList.add("ready");
        coreRef.current?.classList.add("ready");
      }
      targetX = event.clientX;
      targetY = event.clientY;
      scheduleDraw();
      addTrail(event.clientX, event.clientY);
    };

    const click = (event: MouseEvent) => {
      const clickBurst = document.createElement("div");
      clickBurst.className = `storage-click storage-click-${variant}`;
      clickBurst.style.left = `${event.clientX}px`;
      clickBurst.style.top = `${event.clientY}px`;
      const burstCount = variant === "video" ? 6 : 10;
      for (let i = 0; i < burstCount; i += 1) {
        const spark = document.createElement("span");
        spark.style.setProperty("--burst-angle", `${i * (variant === "video" ? 60 : 36)}deg`);
        clickBurst.appendChild(spark);
      }
      document.body.appendChild(clickBurst);
      window.setTimeout(() => clickBurst.remove(), 900);
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => {
      if (animation !== 0) window.cancelAnimationFrame(animation);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, [variant]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div ref={cursorRef} className={`storage-cursor storage-cursor-${variant}`} />
      <div ref={washRef} className={`storage-cursor-wash storage-cursor-wash-${variant}`} />
      <div ref={coreRef} className={`storage-cursor-core storage-cursor-core-${variant}`} />
    </>,
    document.body
  );
}
