"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, FileVideo, Fingerprint, Link2, ScanSearch, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { FuturisticFileUploader } from "@/components/ui/futuristic-file-uploader";
import { VideoPreview } from "@/components/upload/video-preview";
import { Button } from "@/components/ui/button";
import { LeverSwitch } from "@/components/ui/lever-switch";
import { routes } from "@/lib/routes";

type DashboardMode = "register" | "check";

const modeCopy: Record<DashboardMode, { title: string; subtitle: string; action: string }> = {
  register: {
    title: "Register an original video",
    subtitle: "Create a proof certificate for your original short-form video before it spreads.",
    action: "Create Proof Certificate"
  },
  check: {
    title: "Check a reposted video",
    subtitle: "Upload a compressed copy, repost, or suspicious video to find a likely registered origin.",
    action: "Check Original"
  }
};

export function DashboardView() {
  const [mode, setMode] = useState<DashboardMode>("register");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  const copy = modeCopy[mode];

  function handleAction() {
    if (!file) return;
    setStatus("processing");
    window.setTimeout(() => setStatus("done"), 1000);
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--app-bg)] text-[var(--app-fg)]">
      <section className="relative overflow-hidden border-b border-[var(--app-line)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-violet-300">Dashboard</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-[var(--app-fg)] md:text-6xl">
                Upload. Fingerprint. Prove.
              </h1>
              <p className="mt-4 max-w-2xl text-[var(--app-muted)]">
                Pick a flow and drop your video. VidChain prepares the proof workspace after login.
              </p>
            </div>

            <Link className="rounded-full border border-[var(--app-line)] px-4 py-2 text-sm font-semibold text-[var(--app-muted)] transition hover:-translate-y-0.5 hover:text-[var(--app-fg)]" href={routes.home}>
              Overview
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="space-y-4">
          <div className="glass-panel rounded-3xl p-5">
            <p className="pb-4 text-xs font-bold uppercase tracking-[0.28em] text-[var(--app-muted)]">Choose mode</p>
            <LeverSwitch
              checked={mode === "check"}
              leftLabel="Register"
              rightLabel="Check"
              onCheckedChange={(checked) => {
                setMode(checked ? "check" : "register");
                setFile(null);
                setStatus("idle");
              }}
            />
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel relative overflow-hidden rounded-3xl p-6"
            initial={{ opacity: 0, y: 18 }}
            key={mode}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-white">
                {mode === "register" ? <ShieldCheck /> : <ScanSearch />}
              </span>
              <div>
                <h2 className="text-xl font-bold text-[var(--app-fg)]">{copy.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{copy.subtitle}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-[var(--app-fg)]">
              {(mode === "register"
                ? ["Upload original video", "Generate fingerprint", "Prepare Solana proof", "Open certificate"]
                : ["Upload suspected repost", "Generate fingerprint", "Compare candidates", "Open original proof"]
              ).map((step, index) => (
                <motion.div
                  animate={{ opacity: file || index === 0 ? 1 : 0.48, x: 0 }}
                  className="group flex items-center gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] px-3 py-2 transition hover:-translate-y-0.5 hover:border-violet-400/50"
                  initial={{ opacity: 0, x: -10 }}
                  key={step}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--app-fg)] text-xs font-bold text-[var(--app-bg)]">{index + 1}</span>
                  {step}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </aside>

        <main className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(124,58,237,0.16),transparent_28%)]" />
            <div className="relative">
              <FuturisticFileUploader
                ctaLabel={mode === "register" ? "Select Original" : "Select Repost"}
                description={mode === "register" ? "Drop original video here" : "Drop reposted video here"}
                maxFiles={1}
                title={mode === "register" ? "Original Proof Uploader" : "Origin Check Uploader"}
                onFilesChange={(files) => {
                  setFile(files[0] ?? null);
                  setStatus("idle");
                }}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_0.8fr]">
            <div className="glass-panel rounded-3xl p-4">
              <VideoPreview file={file} />
              {!file ? (
                <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-[var(--app-line)] bg-[var(--app-panel)] text-center text-sm text-[var(--app-muted)]">
                  Preview appears here.
                </div>
              ) : null}
            </div>

            <div className="glass-panel flex flex-col justify-between rounded-3xl p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">Action</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--app-fg)]">{copy.action}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                  {file ? `${file.name} is ready for ${mode === "register" ? "proof creation" : "origin checking"}.` : "Choose one video to unlock this action."}
                </p>

                <div className="mt-5 grid gap-2">
                  <StatusPill active={Boolean(file)} icon={<Upload size={15} />} label={file ? "Video loaded" : "Waiting for video"} />
                  <StatusPill active={status !== "idle"} icon={<Fingerprint size={15} />} label={status === "processing" ? "Fingerprint running" : status === "done" ? "Fingerprint ready" : "Fingerprint locked"} />
                  <StatusPill active={status === "done"} icon={<Link2 size={15} />} label={status === "done" ? "Proof link ready" : "Proof link pending"} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {status === "done" ? <ResultCard mode={mode} /> : null}
                <Button className="group relative w-full overflow-hidden bg-[var(--accent)] hover:opacity-95" disabled={!file || status === "processing"} onClick={handleAction}>
                  <span className="absolute inset-y-0 left-0 w-0 bg-white/20 transition-all duration-500 group-hover:w-full" />
                  <span className="relative inline-flex items-center gap-2">
                    {status === "processing" ? <Sparkles size={16} /> : mode === "register" ? <Upload size={16} /> : <FileVideo size={16} />}
                    {status === "processing" ? "Processing..." : copy.action}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}

function ResultCard({ mode }: { mode: DashboardMode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 shadow-[0_18px_70px_rgba(16,185,129,0.12)]"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <CheckCircle2 size={17} />
        {mode === "register" ? "Proof certificate prepared" : "Likely origin match found"}
      </div>
      <p className="mt-2 text-sm text-[var(--app-muted)]">
        {mode === "register"
          ? "Next step: connect backend and Solana adapter for real proof registration."
          : "Next step: connect real fingerprint candidate search from backend."}
      </p>
      <div className="mt-3 rounded-xl bg-black/20 px-3 py-2 font-mono text-xs text-emerald-200">
        sha256:a9f4...91c2 / phash:84%
      </div>
    </motion.div>
  );
}

function StatusPill({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-[var(--app-muted)]">
        <span className={active ? "text-emerald-300" : "text-[var(--app-muted)]"}>{icon}</span>
        {label}
      </span>
      <span className={active ? "h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" : "h-2 w-2 rounded-full bg-white/20"} />
    </div>
  );
}
