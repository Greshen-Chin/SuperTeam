"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Award, CheckCircle2, FileVideo, Fingerprint, Link2, ScanSearch, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { VideoPreview } from "@/components/upload/video-preview";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type DashboardMode = "register" | "check";
type ProcessingStatus = "idle" | "processing" | "done";

type ModeCopy = {
  title: string;
  subtitle: string;
  action: string;
  uploadTitle: string;
  uploadSubtitle: string;
  steps: { title: string; description: string }[];
};

const modeCopy: Record<DashboardMode, ModeCopy> = {
  register: {
    title: "Register an original video",
    subtitle: "Create a proof certificate before your video spreads.",
    action: "Create Proof Certificate",
    uploadTitle: "Drop your original video",
    uploadSubtitle: "VidChain will fingerprint it and prepare a proof certificate.",
    steps: [
      { title: "Upload original video", description: "Drop or select the source file" },
      { title: "Generate fingerprint", description: "Create SHA-256 and visual hash" },
      { title: "Prepare Solana proof", description: "Package metadata for registration" },
      { title: "Open certificate", description: "Share a public proof page" }
    ]
  },
  check: {
    title: "Check a reposted video",
    subtitle: "Find whether a compressed copy likely came from a registered original.",
    action: "Check Original",
    uploadTitle: "Drop suspected repost",
    uploadSubtitle: "VidChain will compare its fingerprint against registered proofs.",
    steps: [
      { title: "Upload suspected repost", description: "Drop or select the copied video" },
      { title: "Generate fingerprint", description: "Read resilient visual signals" },
      { title: "Compare candidates", description: "Search for likely originals" },
      { title: "Open original proof", description: "Review the best match" }
    ]
  }
};

export function DashboardView() {
  const [mode, setMode] = useState<DashboardMode>("register");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const copy = modeCopy[mode];

  function setSelectedFile(nextFile: File | null) {
    setFile(nextFile);
    setStatus("idle");
  }

  function switchMode(nextMode: DashboardMode) {
    setMode(nextMode);
    setSelectedFile(null);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files[0] ?? null);
  }

  function handleAction() {
    if (!file) return;
    setStatus("processing");
    window.setTimeout(() => setStatus("done"), 1400);
  }

  const headline = mode === "register" ? "Upload. Fingerprint. Prove." : "Upload. Compare. Verify.";

  return (
    <div className="dashboard-page min-h-[calc(100vh-5rem)] text-white">
      <section className="relative z-10 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.35em] text-violet-200">Creator Dashboard</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">{headline}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 md:text-base">
                A focused workspace for protecting originals and checking suspicious reposts.
              </p>
            </div>

            <div className="dashboard-hero-actions">
              <Link className="dashboard-primary-link" href={routes.register}>
                <Upload size={16} />
                Upload & Create Certificate
              </Link>
              <Link className="dashboard-secondary-link" href={routes.collection}>
                My Collection
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-8">
        <Link className="dashboard-collection-banner" href={routes.collection}>
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-emerald-200/80">My Collection is ready</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">See every protected video as an NFT card.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Your minted videos now live in a playful collection page with filters, stats, and certificate-style cards.
            </p>
          </div>
          <div className="collection-mini-stack" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <span className="dashboard-collection-cta">
            Open My Collection
            <ArrowRight size={16} />
          </span>
        </Link>
      </section>

      <FlowOverview file={file} status={status} />

      <section className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="space-y-5">
          <ModeSwitcher mode={mode} onChange={switchMode} />

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="dashboard-card overflow-hidden p-6"
            initial={{ opacity: 0, y: 18 }}
            key={mode}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start gap-4">
              <span className={mode === "register" ? "dashboard-icon dashboard-icon-purple" : "dashboard-icon dashboard-icon-mint"}>
                {mode === "register" ? <ShieldCheck size={24} /> : <ScanSearch size={24} />}
              </span>
              <div>
                <h2 className="text-xl font-black">{copy.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/48">{copy.subtitle}</p>
              </div>
            </div>

            <StepsList file={file} mode={mode} status={status} steps={copy.steps} />
          </motion.div>
        </aside>

        <main className="space-y-5">
          <UploadPanel
            copy={copy}
            file={file}
            inputRef={inputRef}
            isDragging={isDragging}
            mode={mode}
            status={status}
            onClear={() => setSelectedFile(null)}
            onDragChange={setIsDragging}
            onDrop={handleDrop}
            onFileInput={handleFileInput}
            onOpenDialog={() => inputRef.current?.click()}
          />

          <div className="dashboard-main-grid">
            <PreviewPanel file={file} mode={mode} status={status} />

            <ActionPanel file={file} mode={mode} status={status} onAction={handleAction} />
          </div>
        </main>
      </section>
    </div>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: DashboardMode; onChange: (mode: DashboardMode) => void }) {
  return (
    <div className="mode-switcher">
      <button className={mode === "register" ? "mode-btn active" : "mode-btn"} data-mode="register" type="button" onClick={() => onChange("register")}>
        <span className="mode-icon"><ShieldCheck size={22} /></span>
        <span className="mode-label">Register</span>
        <span className="mode-sub">Protect my video</span>
      </button>
      <button className={mode === "check" ? "mode-btn active" : "mode-btn"} data-mode="check" type="button" onClick={() => onChange("check")}>
        <span className="mode-icon"><ScanSearch size={22} /></span>
        <span className="mode-label">Check</span>
        <span className="mode-sub">Find the original</span>
      </button>
    </div>
  );
}

function FlowOverview({ file, status }: { file: File | null; status: ProcessingStatus }) {
  const steps = [
    { icon: <Upload size={18} />, label: "Upload", state: file ? "complete" : "active" },
    { icon: <Fingerprint size={18} />, label: "Fingerprint", state: status === "processing" ? "active" : status === "done" ? "complete" : "locked" },
    { icon: <Link2 size={18} />, label: "Proof", state: status === "done" ? "complete" : "locked" },
    { icon: <Award size={18} />, label: "Certificate", state: status === "done" ? "active" : "locked" }
  ];

  return (
    <section className="dashboard-flow-strip">
      {steps.map((step, index) => (
        <div className="flow-step" data-state={step.state} key={step.label}>
          <span className="flow-step-icon">{step.icon}</span>
          <span>{step.label}</span>
          {index < steps.length - 1 ? <i aria-hidden /> : null}
        </div>
      ))}
    </section>
  );
}

function StepsList({ file, mode, status, steps }: { file: File | null; mode: DashboardMode; status: ProcessingStatus; steps: ModeCopy["steps"] }) {
  const activeIndex = useMemo(() => {
    if (status === "done") return steps.length;
    if (status === "processing") return 2;
    if (file) return 1;
    return 0;
  }, [file, status, steps.length]);

  return (
    <div className="steps-list mt-7">
      {steps.map((step, index) => {
        const stepStatus = index < activeIndex ? "complete" : index === activeIndex ? "active" : "idle";
        return (
          <div className="step" data-status={stepStatus} data-step={index + 1} key={`${mode}-${step.title}`}>
            <div className="step-indicator">
              <div className="step-number">
                <span className="step-number-text">{index + 1}</span>
              </div>
              {index < steps.length - 1 ? <div className="step-line" /> : null}
            </div>
            <div className="step-content">
              <span className="step-title">{step.title}</span>
              <span className="step-desc">{step.description}</span>
            </div>
            <div className="step-status-dot" />
          </div>
        );
      })}
    </div>
  );
}

function UploadPanel({
  copy,
  file,
  inputRef,
  isDragging,
  mode,
  status,
  onClear,
  onDragChange,
  onDrop,
  onFileInput,
  onOpenDialog
}: {
  copy: ModeCopy;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  mode: DashboardMode;
  status: ProcessingStatus;
  onClear: () => void;
  onDragChange: (dragging: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenDialog: () => void;
}) {
  const isProcessing = status === "processing";

  return (
    <section
      className={isDragging ? "upload-zone drag-over" : "upload-zone"}
      role="button"
      tabIndex={0}
      onClick={isProcessing ? undefined : onOpenDialog}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragChange(true);
      }}
      onDragLeave={() => onDragChange(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpenDialog();
      }}
    >
      <input ref={inputRef} accept="video/*" className="hidden" type="file" onChange={onFileInput} />

      {isProcessing ? (
        <ProcessingScene file={file} mode={mode} />
      ) : (
        <>
          <div className="vault-mini">
            <Upload className="upload-icon" size={30} />
          </div>
          <div className="upload-zone-text">
            <span className="upload-zone-title">{file ? file.name : copy.uploadTitle}</span>
            <span className="upload-zone-sub">{file ? "File loaded. Start processing when you are ready." : copy.uploadSubtitle}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button className="select-btn" type="button" onClick={(event) => { event.stopPropagation(); onOpenDialog(); }}>
              {mode === "register" ? "Select Original" : "Select Repost"}
            </button>
            {file ? (
              <button className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 px-4 text-xs font-bold text-white/55 transition hover:border-red-300/40 hover:text-white" type="button" onClick={(event) => { event.stopPropagation(); onClear(); }}>
                <X size={14} />
                Clear
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function ProcessingScene({ file, mode }: { file: File | null; mode: DashboardMode }) {
  return (
    <div className="processing-scene">
      <div className="robot-track">
        <div aria-hidden className="css-runner">
          <span className="runner-antenna" />
          <span className="runner-head">
            <span className="runner-eye runner-eye-left" />
            <span className="runner-eye runner-eye-right" />
            <span className="runner-smile" />
          </span>
          <span className="runner-body">
            <span className="runner-meter" />
          </span>
          <span className="runner-arm runner-arm-left" />
          <span className="runner-arm runner-arm-right" />
          <span className="runner-leg runner-leg-left" />
          <span className="runner-leg runner-leg-right" />
          <span className="runner-spark runner-spark-one" />
          <span className="runner-spark runner-spark-two" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-black">{mode === "register" ? "Locking in your proof..." : "Hunting for the original..."}</p>
        <p className="mt-1 max-w-md text-sm text-white/48">{file ? file.name : "Tiny robot doing the fingerprint run"}</p>
      </div>
      <div className="processing-bars" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function PreviewPanel({ file, mode, status }: { file: File | null; mode: DashboardMode; status: ProcessingStatus }) {
  return (
    <section className="dashboard-card p-4">
      {file ? (
        <VideoPreview file={file} />
      ) : (
        <div className="preview-empty">
          <div className={mode === "register" ? "dashboard-icon dashboard-icon-purple" : "dashboard-icon dashboard-icon-mint"}>
            <FileVideo size={28} />
          </div>
          <p className="mt-4 text-lg font-black">{mode === "register" ? "Your original preview lands here" : "Suspicious repost preview lands here"}</p>
          <p className="mt-2 max-w-xs text-center text-sm text-white/42">Drop a video above and this panel becomes your visual checkpoint.</p>
        </div>
      )}
      {status === "done" ? <ResultCard mode={mode} /> : null}
    </section>
  );
}

function ActionPanel({ file, mode, status, onAction }: { file: File | null; mode: DashboardMode; status: ProcessingStatus; onAction: () => void }) {
  const actionLabel = modeCopy[mode].action;

  return (
    <section className="dashboard-card flex flex-col justify-between p-5">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-white/35">Action</p>
        <h3 className="mt-2 text-2xl font-black">{actionLabel}</h3>
        <p className="mt-3 text-sm leading-6 text-white/48">
          {file ? `${file.name} is ready for ${mode === "register" ? "proof creation" : "origin checking"}.` : "Choose one video to unlock the processing run."}
        </p>

        <div className="mt-5 grid gap-2">
          <StatusPill active={Boolean(file)} icon={<Upload size={15} />} label={file ? "Video loaded" : "Waiting for video"} />
          <StatusPill active={status !== "idle"} icon={<Fingerprint size={15} />} label={status === "processing" ? "Robot is fingerprinting" : status === "done" ? "Fingerprint ready" : "Fingerprint locked"} />
          <StatusPill active={status === "done"} icon={<Link2 size={15} />} label={status === "done" ? "Proof link ready" : "Proof link pending"} />
        </div>
      </div>

      <div className="mt-6">
        <Button className="group relative min-h-12 w-full overflow-hidden rounded-full bg-[linear-gradient(135deg,#9945FF,#FF6BFF)] font-black text-white shadow-[0_0_30px_rgba(153,69,255,0.32)] hover:opacity-95" disabled={!file || status === "processing"} onClick={onAction}>
          <span className="absolute inset-y-0 left-0 w-0 bg-white/18 transition-all duration-500 group-hover:w-full" />
          <span className="relative inline-flex items-center gap-2">
            {status === "processing" ? <Sparkles size={16} /> : mode === "register" ? <ShieldCheck size={16} /> : <ScanSearch size={16} />}
            {status === "processing" ? "Processing..." : actionLabel}
          </span>
        </Button>
      </div>
    </section>
  );
}

function ResultCard({ mode }: { mode: DashboardMode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mt-4 rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] p-4 shadow-[0_18px_70px_rgba(20,241,149,0.12)]"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
    >
      <div className="flex items-center gap-2 text-sm font-black text-emerald-200">
        <CheckCircle2 size={17} />
        {mode === "register" ? "Proof certificate prepared" : "Likely origin match found"}
      </div>
      <p className="mt-2 text-sm text-white/48">
        {mode === "register"
          ? "The dashboard is ready to connect this result into the real registration flow."
          : "The dashboard is ready to connect this result into backend candidate search."}
      </p>
      <div className="mt-3 rounded-xl bg-black/22 px-3 py-2 font-mono text-xs text-emerald-200">
        sha256:a9f4...91c2 / phash:84%
      </div>
    </motion.div>
  );
}

function StatusPill({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-white/48">
        <span className={active ? "text-emerald-300" : "text-white/28"}>{icon}</span>
        {label}
      </span>
      <span className={active ? "h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(20,241,149,0.8)]" : "h-2 w-2 rounded-full bg-white/15"} />
    </div>
  );
}
