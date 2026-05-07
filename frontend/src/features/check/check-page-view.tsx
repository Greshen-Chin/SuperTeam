"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Zap,
} from "lucide-react";

const SparklesCore = dynamic(
  () => import("@/components/ui/sparkles").then((mod) => mod.SparklesCore),
  { ssr: false }
);
import { VideoDropzone } from "@/components/upload/video-dropzone";
import { useVerifyVideoFlow } from "@/features/verify/use-verify-video-flow";
import type { MatchType } from "@/shared/schemas";

type StepState = "idle" | "active" | "done" | "error";

const STEPS: { label: string; sublabel: string; icon: React.ReactNode }[] = [
  { label: "SHA-256", sublabel: "Exact hash match", icon: <Zap size={13} /> },
  { label: "pHash", sublabel: "Visual fingerprint", icon: <FileSearch size={13} /> },
  { label: "Registry", sublabel: "On-chain search", icon: <SearchCheck size={13} /> },
];

function getStepStates(flowState: string): StepState[] {
  switch (flowState) {
    case "fingerprinting": return ["active", "idle", "idle"];
    case "checking":       return ["done",   "active", "active"];
    case "match_found":
    case "no_match":       return ["done",   "done",   "done"];
    case "error":          return ["error",  "idle",   "idle"];
    default:               return ["idle",   "idle",   "idle"];
  }
}

const MATCH_CFG: Record<MatchType, { label: string; color: string; glow: string; icon: React.ReactNode; tone: "green" | "amber" | "red" }> = {
  exact:    { label: "Exact Match Found",     color: "#14F195", glow: "rgba(20,241,149,0.18)",  icon: <CheckCircle2 size={18} />, tone: "green" },
  visual:   { label: "Likely Match Found",    color: "#14F195", glow: "rgba(20,241,149,0.15)",  icon: <CheckCircle2 size={18} />, tone: "green" },
  sequence: { label: "Sequence Match",        color: "#4E9BFF", glow: "rgba(78,155,255,0.18)",  icon: <CheckCircle2 size={18} />, tone: "green" },
  possible: { label: "Possible Match",        color: "#FFB347", glow: "rgba(255,179,71,0.18)",  icon: <AlertCircle  size={18} />, tone: "amber" },
  none:     { label: "No Registered Origin",  color: "#FF6B6B", glow: "rgba(255,107,107,0.15)", icon: <ShieldAlert  size={18} />, tone: "red"   },
};

export function CheckPageView() {
  const flow = useVerifyVideoFlow();
  const isBusy    = flow.state === "fingerprinting" || flow.state === "checking";
  const hasResult = flow.state === "match_found" || flow.state === "no_match";
  const stepStates = getStepStates(flow.state);
  const matchCfg  = flow.result ? MATCH_CFG[flow.result.matchType] : null;
  const confidence = flow.result ? Math.round(flow.result.confidence * 100) : 0;

  return (
    <main className="check-page storage-check">
      <CheckCursor />

      {/* Ambient rails */}
      <div className="storage-wallpaper-rails" aria-hidden>
        <span /><span /><span />
      </div>

      <SparklesCore
        background="transparent"
        minSize={0.3}
        maxSize={1.1}
        particleDensity={65}
        className="storage-sparkles"
        particleColor="#FFFFFF"
        speed={0.65}
      />

      {/* Page header */}
      <header className="check-page-header">
        <span className="check-eyebrow">VIDEO CHECK</span>
        <h1>Drop it. Catch the copy.</h1>
        <p>
          Upload a suspected repost or compressed copy.
          VidChain fingerprints it locally and searches the on-chain registry.
        </p>
      </header>

      {/* Two-panel grid */}
      <div className="check-page-grid">

        {/* ── Left panel: upload ── */}
        <section className="check-panel">
          <div className="check-panel-header">
            <UploadCloud size={16} />
            <span>Upload</span>
          </div>

          <div className="check-dropzone-wrap">
            <VideoDropzone disabled={isBusy} file={flow.file} onFileSelected={flow.selectFile} />
          </div>

          {/* Step indicators */}
          <div className="check-steps">
            {STEPS.map((step, i) => {
              const s = stepStates[i] ?? "idle";
              return (
                <div className={`check-step check-step-${s}`} key={step.label}>
                  <div className="check-step-icon">
                    {s === "done"   ? <CheckCircle2 size={13} /> :
                     s === "error"  ? <AlertCircle  size={13} /> :
                     step.icon}
                  </div>
                  <div className="check-step-body">
                    <strong>{step.label}</strong>
                    <small>{step.sublabel}</small>
                  </div>
                  {s === "active" ? <span className="check-step-pulse" /> : null}
                </div>
              );
            })}
          </div>

          {flow.error ? (
            <p className="check-error-msg">
              <AlertCircle size={14} />
              {flow.error}
            </p>
          ) : null}

          <button
            className="check-verify-btn"
            disabled={!flow.file || isBusy}
            onClick={flow.verify}
            type="button"
          >
            {isBusy ? (
              <><span className="check-spinner" />Checking…</>
            ) : (
              <><SearchCheck size={15} />Check Original</>
            )}
          </button>
        </section>

        {/* ── Right panel: result ── */}
        <aside className="check-panel check-result-panel">
          <div className="check-panel-header">
            <FileSearch size={16} />
            <span>Result</span>
          </div>

          {/* State: idle – no file yet */}
          {flow.state === "idle" ? (
            <div className="check-result-idle">
              <div className="check-radar-mini">
                <span /><span /><span />
                <SearchCheck size={26} />
              </div>
              <p>Waiting for a file.</p>
              <small>Drop a video on the left — originals, re-encodes, or resized copies all work.</small>

              <div className="check-how-list">
                {[
                  { icon: <Zap size={14} />,        label: "SHA-256 byte-exact match" },
                  { icon: <FileSearch size={14} />,  label: "pHash survives re-encoding" },
                  { icon: <ShieldCheck size={14} />, label: "On-chain Solana registry" },
                ].map((item) => (
                  <div className="check-how-item" key={item.label}>
                    <span className="check-how-icon">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* State: file selected, not yet run */}
          {flow.state === "file_selected" ? (
            <div className="check-result-ready">
              <div className="check-file-pill">
                <UploadCloud size={16} />
                <span>{flow.file?.name}</span>
              </div>
              <p className="check-ready-label">Ready to check</p>
              <small>{flow.file ? `${(flow.file.size / 1_000_000).toFixed(1)} MB` : ""}</small>
              <p className="check-ready-hint">Click <strong>Check Original</strong> to fingerprint and search.</p>
            </div>
          ) : null}

          {/* State: processing */}
          {isBusy ? (
            <div className="check-result-busy">
              <div className="check-orb">
                <span /><span /><span />
              </div>
              <p>Analyzing fingerprint…</p>
              <small>
                {flow.state === "fingerprinting"
                  ? "Computing SHA-256 and pHash locally"
                  : "Searching registered proofs on-chain"}
              </small>
            </div>
          ) : null}

          {/* State: result */}
          {hasResult && flow.result && matchCfg ? (
            <div
              className={`check-result-found check-result-${matchCfg.tone}`}
              style={{ "--r-color": matchCfg.color, "--r-glow": matchCfg.glow } as CSSProperties}
            >
              <div className="check-result-badge">
                {matchCfg.icon}
                <span>{matchCfg.label}</span>
              </div>

              {/* Confidence bar */}
              <div className="check-confidence">
                <div className="check-confidence-row">
                  <span>Confidence</span>
                  <strong>{confidence}%</strong>
                </div>
                <div className="check-confidence-track">
                  <div
                    className="check-confidence-fill"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>

              {flow.result.certificateUrl ? (
                <Link className="check-cert-link" href={flow.result.certificateUrl}>
                  <ShieldCheck size={14} />
                  Open original certificate
                  <ExternalLink size={12} />
                </Link>
              ) : (
                <p className="check-no-origin">
                  No registered origin was found in the registry for this video.
                </p>
              )}

              <p className="check-result-tip">
                Drop a new file on the left to check another video.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

/* ─── Custom cursor ─── */
function CheckCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [trail, setTrail] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const trailId = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setReady(true);
      setPos({ x: e.clientX, y: e.clientY });
      const id = ++trailId.current;
      setTrail((t) => [...t.slice(-12), { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setTrail((t) => t.filter((p) => p.id !== id)), 600);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      <div
        className={ready ? "check-cursor ready" : "check-cursor"}
        style={{ transform: `translate3d(${pos.x - 20}px,${pos.y - 20}px,0)` }}
      />
      <div
        className={ready ? "check-cursor-wash ready" : "check-cursor-wash"}
        style={{ transform: `translate3d(${pos.x - 160}px,${pos.y - 160}px,0)` }}
      />
      {trail.map((p, i) => (
        <span
          className="check-trail"
          key={p.id}
          style={{ left: p.x, top: p.y, opacity: (i + 1) / 14 } as CSSProperties}
        />
      ))}
    </>
  );
}
