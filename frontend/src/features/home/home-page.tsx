"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Fingerprint, Flame, Heart, ScanSearch } from "lucide-react";
import MotionButton from "@/components/ui/motion-button";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type TutorialMode = "register" | "check";

const tutorials: Record<TutorialMode, { title: string; description: string; steps: string[] }> = {
  register: {
    title: "Register an original video",
    description: "Use this when you are the creator and want a public proof certificate before the video spreads.",
    steps: [
      "Upload the original short video.",
      "VidChain generates SHA-256 and visual fingerprint data.",
      "Confirm proof registration for Solana Devnet.",
      "Share the public certificate link."
    ]
  },
  check: {
    title: "Check a reposted video",
    description: "Use this when you find a suspicious repost, compressed copy, or brand usage.",
    steps: [
      "Upload the suspected repost.",
      "VidChain generates a fresh fingerprint.",
      "The verifier compares against registered proofs.",
      "Open the original creator certificate if a match is found."
    ]
  }
};

export function HomePage() {
  const [tutorialMode, setTutorialMode] = useState<TutorialMode>("register");
  const tutorial = tutorials[tutorialMode];

  return (
    <div className="overflow-hidden bg-[var(--app-bg)]">
      <section className="relative min-h-[calc(100vh-5rem)] overflow-hidden border-b border-[var(--app-line)] bg-[var(--app-bg)]">
        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="max-w-4xl text-5xl font-bold leading-[0.98] tracking-tight text-[var(--app-fg)] md:text-7xl">
            Prove where a viral video started.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--app-muted)]">
            Register originals. Check reposts. Share proof.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
            <MotionButton href={routes.dashboard} label="Get Started" />
            <a className="inline-flex h-12 items-center rounded-full border border-[var(--app-line)] px-6 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--app-panel)]" href="#tutorial">
              Learn the flow
            </a>
          </div>
        </div>
      </section>

      <section id="tutorial" className="relative border-b border-[var(--app-line)] bg-[var(--app-bg-soft)] px-4 py-24">
        <div className="absolute inset-y-0 left-0 w-1/2 dot-grid opacity-20" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">How it works</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[var(--app-fg)] md:text-5xl">
              Two flows. One proof network.
            </h2>
            <p className="mt-5 max-w-lg text-[var(--app-muted)]">
              Choose a flow to see the steps.
            </p>

            <div className="mt-8 inline-flex rounded-full bg-white p-1 shadow-2xl shadow-black/20">
              <TutorialToggle active={tutorialMode === "register"} icon={<Flame size={15} />} label="Register" onClick={() => setTutorialMode("register")} />
              <TutorialToggle active={tutorialMode === "check"} icon={<Heart size={15} />} label="Check Original" onClick={() => setTutorialMode("check")} />
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-white">
                {tutorialMode === "register" ? <Fingerprint /> : <ScanSearch />}
              </span>
              <div>
                <h3 className="text-2xl font-bold text-[var(--app-fg)]">{tutorial.title}</h3>
                <p className="mt-2 text-[var(--app-muted)]">{tutorial.description}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {tutorial.steps.map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-fg)] text-sm font-bold text-[var(--app-bg)]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-[var(--app-fg)]">{step}</span>
                </div>
              ))}
            </div>

            <Link className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90" href={routes.dashboard}>
              Continue to dashboard
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function TutorialToggle({
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
        "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition",
        active ? "bg-[var(--accent)] text-white shadow-lg shadow-violet-950/30" : "text-zinc-700 hover:bg-zinc-100"
      )}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
