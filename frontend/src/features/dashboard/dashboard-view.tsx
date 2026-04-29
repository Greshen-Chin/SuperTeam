"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Flame, Heart, ScanSearch, ShieldCheck } from "lucide-react";
import { FuturisticFileUploader } from "@/components/ui/futuristic-file-uploader";
import { VideoPreview } from "@/components/upload/video-preview";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

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
    <div className="min-h-[calc(100vh-5rem)] bg-[var(--app-bg)]">
      <section className="relative overflow-hidden border-b border-[var(--app-line)]">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--app-fg)] md:text-6xl">
                Register proof or check an origin.
              </h1>
              <p className="mt-4 max-w-2xl text-[var(--app-muted)]">
                Pick a flow. Upload a video. Run the demo.
              </p>
            </div>

            <Link className="text-sm font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-fg)]" href={routes.home}>
              Back to overview
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-4">
          <div className="glass-panel rounded-3xl p-4">
            <p className="px-2 pb-3 text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">Choose mode</p>
            <div className="inline-flex w-full rounded-full bg-white p-1 shadow-2xl shadow-black/30">
              <ModeButton active={mode === "register"} icon={<Flame size={15} />} label="Register Video" onClick={() => setMode("register")} />
              <ModeButton active={mode === "check"} icon={<Heart size={15} />} label="Check Original" onClick={() => setMode("check")} />
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
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
                <div key={step} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--app-fg)] text-xs font-bold text-[var(--app-bg)]">{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-5">
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
                  Frontend demo now. Backend and Solana adapters are ready for later.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {status === "done" ? <ResultCard mode={mode} /> : null}
                <Button className="w-full bg-[var(--accent)] hover:opacity-90" disabled={!file || status === "processing"} onClick={handleAction}>
                  {status === "processing" ? "Processing..." : copy.action}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition",
        active ? "bg-[var(--accent)] text-white" : "text-zinc-700 hover:bg-zinc-100"
      )}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultCard({ mode }: { mode: DashboardMode }) {
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
        <CheckCircle2 size={17} />
        {mode === "register" ? "Proof certificate prepared" : "Likely origin match found"}
      </div>
      <p className="mt-2 text-sm text-[var(--app-muted)]">
        {mode === "register"
          ? "Next step: connect backend and Solana adapter for real proof registration."
          : "Next step: connect real fingerprint candidate search from backend."}
      </p>
    </div>
  );
}
