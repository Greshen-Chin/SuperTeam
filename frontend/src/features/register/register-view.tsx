"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ExternalLink,
  FileVideo,
  Fingerprint,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { routes } from "@/lib/routes";
import { useRegisterVideoFlow } from "./use-register-video-flow";
import type { RegisterState } from "./use-register-video-flow";
import type { Proof } from "@/shared/schemas";

const PROCESSING_STEPS = [
  "Generating SHA-256 fingerprint...",
  "Uploading to IPFS...",
  "Signing with Solana...",
  "Anchoring to blockchain..."
];

const SparklesCore = dynamic(
  () => import("@/components/ui/sparkles").then((mod) => mod.SparklesCore),
  { ssr: false }
);

const STATE_TO_STEP: Partial<Record<RegisterState, number>> = {
  fingerprinting: 0,
  uploading: 1,
  waiting_for_signature: 2,
  creating_certificate: 3
};

const STATE_TO_PROGRESS: Partial<Record<RegisterState, number>> = {
  fingerprinting: 20,
  uploading: 45,
  waiting_for_signature: 70,
  creating_certificate: 90,
  success: 100
};

type TerminalRowState = "done" | "active" | "pending";

const formatSize = (file: File | null) => {
  if (!file) return "0 KB";
  if (file.size < 1024 * 1024) return `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
};

export function RegisterView() {
  const flow = useRegisterVideoFlow();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isIdle = flow.state === "idle";
  const isFileSelected = flow.state === "file_selected" || flow.state === "error";
  const isProcessing = ["fingerprinting", "uploading", "waiting_for_signature", "creating_certificate"].includes(flow.state);
  const isComplete = flow.state === "success";

  const activeStepIndex = STATE_TO_STEP[flow.state] ?? (isComplete ? PROCESSING_STEPS.length : 0);
  const progress = STATE_TO_PROGRESS[flow.state] ?? (isComplete ? 100 : 0);
  const filename = flow.file?.name ?? "your-media.mp4";
  const fileSize = formatSize(flow.file);

  const terminalRows = useMemo(
    () => PROCESSING_STEPS.map((text, index): { text: string; state: TerminalRowState } => {
      if (isComplete || index < activeStepIndex) return { text, state: "done" };
      if (index === activeStepIndex) return { text, state: "active" };
      return { text, state: "pending" };
    }),
    [activeStepIndex, isComplete]
  );

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    flow.selectFile(file);
  }, [flow]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  }, [handleFile]);

  return (
    <div
      className={isDragging ? "vid-upload-page drag-active" : "vid-upload-page"}
      onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <ParticleCanvas />
      <InteractiveUploadEffects />
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
            particleColor="#AB9FF2"
            speed={1.2}
          />
        </div>

        <div className="upload-state-stage">
          {isIdle ? (
            <IdleState
              isDragging={isDragging}
              onOpenDialog={() => inputRef.current?.click()}
            />
          ) : null}

          {isFileSelected ? (
            <FileSelectedState
              file={flow.file}
              filename={filename}
              fileSize={fileSize}
              title={flow.title}
              onTitleChange={flow.setTitle}
              onCreateProof={() => void flow.createProof()}
              onChangeFile={() => { flow.reset(); inputRef.current?.click(); }}
              canCreate={flow.canCreateProof}
              error={flow.error}
            />
          ) : null}

          {isProcessing ? (
            <ProcessingState
              activeStepIndex={activeStepIndex}
              fileSize={fileSize}
              filename={filename}
              progress={progress}
              rows={terminalRows}
            />
          ) : null}

          {isComplete ? (
            <CompleteState
              filename={filename}
              fileSize={fileSize}
              proof={flow.proof}
              onReset={flow.reset}
            />
          ) : null}
        </div>
      </section>

      <input
        ref={inputRef}
        accept="video/*,image/*"
        className="hidden"
        type="file"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function IdleState({ isDragging, onOpenDialog }: { isDragging: boolean; onOpenDialog: () => void }) {
  return (
    <div className="upload-idle-state">
      <p className="upload-kicker">VIDCHAIN PROTECTION</p>
      <h1>Drop your file.<br />Own it forever.</h1>
      <p className="upload-subcopy">Your video or image gets fingerprinted and anchored to Solana blockchain in seconds.</p>

      <button className={isDragging ? "vault-portal drag-over" : "vault-portal"} type="button" onClick={onOpenDialog}>
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
          <ShieldVaultIcon />
        </span>
      </button>

      <p className="upload-hint">click to protect - or drag file here</p>
      <div className="file-type-pills">
        {["MP4", "MOV", "AVI", "MKV", "JPG", "PNG"].map((type) => <span key={type}>{type}</span>)}
      </div>
    </div>
  );
}

function FileSelectedState({
  file,
  filename,
  fileSize,
  title,
  onTitleChange,
  onCreateProof,
  onChangeFile,
  canCreate,
  error
}: {
  file: File | null;
  filename: string;
  fileSize: string;
  title: string;
  onTitleChange: (v: string) => void;
  onCreateProof: () => void;
  onChangeFile: () => void;
  canCreate: boolean;
  error: string | null;
}) {
  return (
    <div className="upload-idle-state">
      <p className="upload-kicker">FILE READY</p>
      <h1>Name your proof.</h1>
      <p className="upload-subcopy">Give your work a title so it appears on the certificate.</p>

      <div className="processing-file-row" style={{ marginBottom: "1.25rem" }}>
        <span className="processing-file-icon">
          <FileVideo size={22} />
        </span>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: "0.9rem", marginBottom: 0 }}>{filename}</h2>
          <p style={{ fontSize: "0.75rem" }}>{fileSize}</p>
        </div>
        <button
          className="protect-another-btn"
          style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
          type="button"
          onClick={onChangeFile}
        >
          Change
        </button>
      </div>

      <input
        autoFocus
        className="proof-title-input"
        maxLength={120}
        placeholder="e.g. My Short Film — Final Cut"
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canCreate) onCreateProof(); }}
      />

      {error ? (
        <div className="proof-error-row">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        className="vault-portal"
        style={{ marginTop: "1rem", opacity: canCreate ? 1 : 0.45, cursor: canCreate ? "pointer" : "not-allowed" }}
        type="button"
        disabled={!canCreate}
        onClick={onCreateProof}
        aria-label="Create proof"
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
          <ShieldVaultIcon />
        </span>
      </button>

      <p className="upload-hint">{canCreate ? "click to protect" : "connect wallet to continue"}</p>
    </div>
  );
}

function ProcessingState({
  activeStepIndex,
  filename,
  fileSize,
  progress,
  rows
}: {
  activeStepIndex: number;
  filename: string;
  fileSize: string;
  progress: number;
  rows: Array<{ text: string; state: TerminalRowState }>;
}) {
  return (
    <div className="upload-processing-state">
      <div className="processing-file-row">
        <span className="processing-file-icon">
          <FileVideo size={22} />
        </span>
        <div>
          <h2>{filename}</h2>
          <p>{fileSize} - {progress < 100 ? "processing" : "ready"}</p>
        </div>
      </div>

      <div className="terminal-box">
        {rows.map((row) => (
          <div className="terminal-row" data-state={row.state} key={row.text}>
            <span>{row.state === "done" ? "✓" : row.state === "active" ? "●" : "○"}</span>
            {row.text}
          </div>
        ))}
      </div>

      <div className="progress-panel">
        <div className="progress-label-row">
          <span>ANALYZING</span>
          <strong>{progress}%</strong>
        </div>
        <div className="premium-progress-track">
          <div className="premium-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="robot-scene-box">
        <p>FINGERPRINT PROGRESS</p>
        <div className="robot-lane">
          <div className="robot-glow-trail" style={{ width: `${progress}%` }} />
          <div className="upload-robot" style={{ left: `calc(${progress}% - 26px)` }}>🤖</div>
        </div>
        <div className="milestone-track">
          <div className="milestone-fill" style={{ width: `${progress}%` }} />
          {[25, 50, 75, 100].map((point, index) => (
            <span
              className={progress >= point ? "milestone-dot passed" : "milestone-dot"}
              key={point}
              style={{ left: `${point}%` }}
            >
              <small>{`MS${index + 1}`}</small>
            </span>
          ))}
        </div>
        <p className="robot-caption">
          {activeStepIndex < PROCESSING_STEPS.length
            ? PROCESSING_STEPS[activeStepIndex]
            : "Certificate ready."}
        </p>
      </div>
    </div>
  );
}

function CompleteState({
  filename,
  fileSize,
  proof,
  onReset
}: {
  filename: string;
  fileSize: string;
  proof: Proof | null;
  onReset: () => void;
}) {
  const proofId = proof?.id ?? "—";
  const sha256Short = proof?.sha256 ? `${proof.sha256.slice(0, 8)}...` : "—";

  return (
    <div className="upload-complete-state">
      <div className="success-burst">
        <CheckCircle2 size={42} />
      </div>
      <p className="upload-kicker">CERTIFICATE READY</p>
      <h1>Your file is protected.</h1>
      <p className="upload-subcopy">{filename} has been fingerprinted and anchored to Solana.</p>

      <div className="complete-card-grid">
        <div className="complete-card">
          <ShieldCheck size={22} />
          <strong>Proof Certificate</strong>
          {proof ? (
            <Link
              className="complete-card-link"
              href={routes.certificate(proof.id)}
              style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--accent-purple)" }}
            >
              {proofId}
              <ExternalLink size={11} />
            </Link>
          ) : (
            <span>{proofId}</span>
          )}
        </div>
        <div className="complete-card">
          <Archive size={22} />
          <strong>NFT Storage</strong>
          <span>{fileSize} archived</span>
        </div>
        <div className="complete-card">
          <Fingerprint size={22} />
          <strong>Fingerprint</strong>
          <span>sha256: {sha256Short}</span>
        </div>
      </div>

      <button className="protect-another-btn" type="button" onClick={onReset}>
        <RotateCcw size={16} />
        Protect another file
      </button>
    </div>
  );
}

function ShieldVaultIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden>
      <path d="M18 4L6 9v8c0 7 5 13 12 15C25 30 30 24 30 17V9L18 4z" fill="url(#sg)" />
      <path d="M13 18l4 4 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#9945FF" />
          <stop offset="1" stopColor="#FF6BFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const colors = ["153,69,255", "20,241,149", "255,107,255", "78,155,255"];
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let animation = 0;

    const particles = Array.from({ length: 55 }, () => {
      const color = colors[Math.floor(Math.random() * colors.length)] ?? colors[0];
      return {
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        color,
        opacity: 0.06 + Math.random() * 0.24,
        size: 0.4 + Math.random() * 1.8
      };
    });

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = Math.floor(width * ratio); canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const move = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const leave = () => { mouse.x = -9999; mouse.y = -9999; };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        const px = p.x * width; const py = p.y * height;
        const dx = px - mouse.x; const dy = py - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.6;
          p.vx += (dx / dist) * force; p.vy += (dy / dist) * force;
        }
        p.vx += (0.5 - p.x) * 0.0002 * width;
        p.vy += (0.5 - p.y) * 0.0002 * height;
        p.vx *= 0.96; p.vy *= 0.96;
        p.x += p.vx / width; p.y += p.vy / height;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.x = Math.min(1, Math.max(0, p.x)); p.y = Math.min(1, Math.max(0, p.y));
        context.beginPath();
        context.fillStyle = `rgba(${p.color},${p.opacity})`;
        context.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
        context.fill();
      });
      animation = window.requestAnimationFrame(draw);
    };

    resize(); draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseleave", leave);
    return () => {
      window.cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);

  return <canvas className="upload-particle-canvas" ref={canvasRef} aria-hidden />;
}

function InteractiveUploadEffects() {
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const burstIdRef = useRef(0);

  useEffect(() => {
    const move = (e: MouseEvent) => { setReady(true); setPoint({ x: e.clientX, y: e.clientY }); };
    const click = (e: MouseEvent) => {
      const id = burstIdRef.current + 1;
      burstIdRef.current = id;
      setBursts((cur) => [...cur.slice(-4), { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => setBursts((cur) => cur.filter((b) => b.id !== id)), 900);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("click", click); };
  }, []);

  return (
    <>
      <div
        className={ready ? "upload-cursor-aura ready" : "upload-cursor-aura"}
        style={{ transform: `translate3d(${point.x - 160}px, ${point.y - 160}px, 0)` }}
      />
      <div
        className={ready ? "upload-cursor-ring ready" : "upload-cursor-ring"}
        style={{ transform: `translate3d(${point.x - 16}px, ${point.y - 16}px, 0)` }}
      />
      <div className="upload-energy-rails" aria-hidden>
        <span /><span /><span /><span />
      </div>
      {bursts.map((burst) => (
        <div className="upload-click-burst" key={burst.id} style={{ left: burst.x, top: burst.y }}>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} style={{ "--spark-rotate": `${i * 45}deg` } as CSSProperties} />
          ))}
        </div>
      ))}
    </>
  );
}
