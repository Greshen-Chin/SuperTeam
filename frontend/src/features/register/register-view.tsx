"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent } from "react";
import { Archive, CheckCircle2, FileVideo, Fingerprint, RotateCcw, ShieldCheck } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";

type UploadState = "idle" | "processing" | "complete";
type TerminalState = "done" | "active" | "pending";

type ProcessingStep = {
  text: string;
  targetPct: number;
  duration: number;
};

const processingSteps: ProcessingStep[] = [
  { text: "Generating SHA-256 fingerprint...", targetPct: 25, duration: 900 },
  { text: "Building pHash visual signature...", targetPct: 50, duration: 1100 },
  { text: "Querying Solana registry...", targetPct: 75, duration: 1000 },
  { text: "Anchoring to blockchain...", targetPct: 100, duration: 1200 }
];

const formatSize = (file: File | null) => {
  if (!file) return "142 MB";
  if (file.size < 1024 * 1024) return `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
};

export function RegisterView() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [visibleRows, setVisibleRows] = useState(1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<number[]>([]);

  const filename = file?.name ?? "vidchain-original-video.mp4";
  const fileSize = formatSize(file);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setUploadState("idle");
    setProgress(0);
    setActiveStepIndex(0);
    setVisibleRows(1);
    setIsDragging(false);
  }, [clearTimers]);

  const startProcessing = useCallback((nextFile: File | null) => {
    if (nextFile) setFile(nextFile);
    clearTimers();
    setUploadState("processing");
    setProgress(0);
    setActiveStepIndex(0);
    setVisibleRows(1);

    let elapsed = 0;
    processingSteps.forEach((step, index) => {
      const startTimer = window.setTimeout(() => {
        setActiveStepIndex(index);
        setVisibleRows(index + 1);
        setProgress(step.targetPct);
      }, elapsed);
      timersRef.current.push(startTimer);
      elapsed += step.duration;
    });

    const completeTimer = window.setTimeout(() => {
      setVisibleRows(processingSteps.length);
      setActiveStepIndex(processingSteps.length);
      setProgress(100);
      setUploadState("complete");
    }, elapsed + 240);
    timersRef.current.push(completeTimer);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const nextFile = event.dataTransfer.files[0] ?? null;
    startProcessing(nextFile);
  };

  const terminalRows = useMemo(
    () => processingSteps.map((step, index) => {
      let state: TerminalState = "pending";
      if (index < activeStepIndex || uploadState === "complete") state = "done";
      else if (index === activeStepIndex) state = "active";
      return { ...step, state };
    }),
    [activeStepIndex, uploadState]
  );

  return (
    <div
      className={isDragging ? "vid-upload-page drag-active" : "vid-upload-page"}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
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
          {uploadState === "idle" ? (
            <IdleState
              isDragging={isDragging}
              onOpenDialog={() => inputRef.current?.click()}
            />
          ) : null}

          {uploadState === "processing" ? (
            <ProcessingState
              activeStepIndex={activeStepIndex}
              fileSize={fileSize}
              filename={filename}
              progress={progress}
              rows={terminalRows}
              visibleRows={visibleRows}
            />
          ) : null}

          {uploadState === "complete" ? (
            <CompleteState fileSize={fileSize} filename={filename} onReset={reset} />
          ) : null}
        </div>
      </section>

      <input
        ref={inputRef}
        accept="video/*"
        className="hidden"
        type="file"
        onChange={(event) => startProcessing(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function IdleState({ isDragging, onOpenDialog }: { isDragging: boolean; onOpenDialog: () => void }) {
  return (
    <div className="upload-idle-state">
      <p className="upload-kicker">VIDCHAIN PROTECTION</p>
      <h1>Drop your video.<br />Own it forever.</h1>
      <p className="upload-subcopy">Your video gets fingerprinted and anchored to Solana blockchain in seconds.</p>

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

      <p className="upload-hint">click to protect - or drag video here</p>
      <div className="file-type-pills">
        {["MP4", "MOV", "AVI", "MKV"].map((type) => <span key={type}>{type}</span>)}
      </div>
    </div>
  );
}

function ProcessingState({
  activeStepIndex,
  filename,
  fileSize,
  progress,
  rows,
  visibleRows
}: {
  activeStepIndex: number;
  filename: string;
  fileSize: string;
  progress: number;
  rows: Array<ProcessingStep & { state: TerminalState }>;
  visibleRows: number;
}) {
  return (
    <div className="upload-processing-state">
      <div className="processing-file-row">
        <span className="processing-file-icon">
          <FileVideo size={22} />
        </span>
        <div>
          <h2>{filename}</h2>
          <p>{fileSize} - {progress < 100 ? "fingerprinting" : "ready"}</p>
        </div>
      </div>

      <div className="terminal-box">
        {rows.slice(0, visibleRows).map((row) => (
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
            <span className={progress >= point ? "milestone-dot passed" : "milestone-dot"} key={point} style={{ left: `${point}%` }}>
              <small>{`MS${index + 1}`}</small>
            </span>
          ))}
        </div>
        <p className="robot-caption">{activeStepIndex < processingSteps.length ? processingSteps[activeStepIndex]?.text : "Certificate ready."}</p>
      </div>
    </div>
  );
}

function CompleteState({ filename, fileSize, onReset }: { filename: string; fileSize: string; onReset: () => void }) {
  return (
    <div className="upload-complete-state">
      <div className="success-burst">
        <CheckCircle2 size={42} />
      </div>
      <p className="upload-kicker">CERTIFICATE READY</p>
      <h1>Your video is protected.</h1>
      <p className="upload-subcopy">{filename} has a fingerprint, Solana proof placeholder, and storage card ready for review.</p>

      <div className="complete-card-grid">
        <div className="complete-card">
          <ShieldCheck size={22} />
          <strong>Proof Certificate</strong>
          <span>proof_demo_0042</span>
        </div>
        <div className="complete-card">
          <Archive size={22} />
          <strong>NFT & Video Storage</strong>
          <span>{fileSize} archived</span>
        </div>
        <div className="complete-card">
          <Fingerprint size={22} />
          <strong>Fingerprint</strong>
          <span>sha256: 7f83b165...</span>
        </div>
      </div>

      <button className="protect-another-btn" type="button" onClick={onReset}>
        <RotateCcw size={16} />
        Protect another video
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

    const colors = [
      "153,69,255",
      "20,241,149",
      "255,107,255",
      "78,155,255"
    ];
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let animation = 0;

    const particles = Array.from({ length: 55 }, () => {
      const color = colors[Math.floor(Math.random() * colors.length)] ?? colors[0];
      return {
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        color,
        opacity: 0.06 + Math.random() * 0.24,
        size: 0.4 + Math.random() * 1.8
      };
    });

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const move = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const leave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const px = particle.x * width;
        const py = particle.y * height;
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < 120) {
          const force = (120 - distance) / 120 * 0.6;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }

        particle.vx += (0.5 - particle.x) * 0.0002 * width;
        particle.vy += (0.5 - particle.y) * 0.0002 * height;
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        particle.x += particle.vx / width;
        particle.y += particle.vy / height;

        if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.vy *= -1;
        particle.x = Math.min(1, Math.max(0, particle.x));
        particle.y = Math.min(1, Math.max(0, particle.y));

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
  }, []);

  return <canvas className="upload-particle-canvas" ref={canvasRef} aria-hidden />;
}

function InteractiveUploadEffects() {
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const burstIdRef = useRef(0);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      setReady(true);
      setPoint({ x: event.clientX, y: event.clientY });
    };
    const click = (event: MouseEvent) => {
      const id = burstIdRef.current + 1;
      burstIdRef.current = id;
      setBursts((current) => [...current.slice(-4), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
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
      <div
        className={ready ? "upload-cursor-aura ready" : "upload-cursor-aura"}
        style={{ transform: `translate3d(${point.x - 160}px, ${point.y - 160}px, 0)` }}
      />
      <div
        className={ready ? "upload-cursor-ring ready" : "upload-cursor-ring"}
        style={{ transform: `translate3d(${point.x - 16}px, ${point.y - 16}px, 0)` }}
      />
      <div className="upload-energy-rails" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      {bursts.map((burst) => (
        <div className="upload-click-burst" key={burst.id} style={{ left: burst.x, top: burst.y }}>
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} style={{ "--spark-rotate": `${index * 45}deg` } as CSSProperties} />
          ))}
        </div>
      ))}
    </>
  );
}
