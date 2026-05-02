"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  FileVideo,
  Fingerprint,
  Hash,
  Link2,
  Plus,
  ScanSearch,
  Share2,
  Upload,
  Video
} from "lucide-react";
import { BackgroundBoxes } from "@/components/ui/background-boxes";
import { LeverSwitch } from "@/components/ui/lever-switch";
import { TextScramble } from "@/components/ui/text-scramble";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

type TutorialMode = "register" | "check";

const tutorials: Record<TutorialMode, { title: string; description: string; steps: { title: string; detail: string; icon: ReactNode }[] }> = {
  register: {
    title: "Register an original video",
    description: "Use this when you are the creator and want a public proof certificate before the video spreads.",
    steps: [
      {
        title: "Upload the original",
        detail: "Drop the first clean video file before it gets reposted or compressed.",
        icon: <Upload size={18} />
      },
      {
        title: "Generate fingerprints",
        detail: "VidChain reads SHA-256 and visual pHash evidence from the video.",
        icon: <Fingerprint size={18} />
      },
      {
        title: "Anchor the proof",
        detail: "The proof is prepared as a public certificate on Solana Devnet.",
        icon: <BadgeCheck size={18} />
      },
      {
        title: "Share the certificate",
        detail: "Send one link that shows creator, timestamp, hash, and video proof.",
        icon: <Share2 size={18} />
      }
    ]
  },
  check: {
    title: "Check a reposted video",
    description: "Use this when you find a suspicious repost, compressed copy, or brand usage.",
    steps: [
      {
        title: "Upload suspicious repost",
        detail: "Use the copy you found on social media, even if it is resized.",
        icon: <FileVideo size={18} />
      },
      {
        title: "Read its signature",
        detail: "VidChain generates a fresh fingerprint for the suspicious video.",
        icon: <Hash size={18} />
      },
      {
        title: "Compare with proofs",
        detail: "The verifier checks whether this video is close to registered originals.",
        icon: <ScanSearch size={18} />
      },
      {
        title: "Open the origin",
        detail: "If there is a match, open the original creator certificate link.",
        icon: <Link2 size={18} />
      }
    ]
  }
};

export function HomePage() {
  const [tutorialMode, setTutorialMode] = useState<TutorialMode>("register");
  const [showIntro, setShowIntro] = useState(true);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const introTimeoutRef = useRef<number | null>(null);
  const tutorial = tutorials[tutorialMode];
  const finishIntro = useCallback(() => {
    introTimeoutRef.current = window.setTimeout(() => setShowIntro(false), 650);
  }, []);

  useEffect(() => {
    return () => {
      if (introTimeoutRef.current) {
        window.clearTimeout(introTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setHoveredStep(null);
  }, [tutorialMode]);

  return (
    <div className="home-cinematic relative overflow-hidden bg-black">
      <VideoCursor hoveredStep={hoveredStep} mode={tutorialMode} />

      <AnimatePresence>
        {showIntro ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-black"
            exit={{ opacity: 0, scale: 1.02 }}
            initial={{ opacity: 1 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-black" />
            <div className="pointer-events-none absolute inset-8 border border-white/10 md:inset-14" />
            <div className="pointer-events-none absolute left-8 top-8 h-12 w-12 border-l border-t border-white/45 md:left-14 md:top-14" />
            <div className="pointer-events-none absolute right-8 top-8 h-12 w-12 border-r border-t border-white/45 md:right-14 md:top-14" />
            <div className="pointer-events-none absolute bottom-8 left-8 h-12 w-12 border-b border-l border-white/45 md:bottom-14 md:left-14" />
            <div className="pointer-events-none absolute bottom-8 right-8 h-12 w-12 border-b border-r border-white/45 md:bottom-14 md:right-14" />
            <motion.div
              animate={{ y: ["-42vh", "42vh", "-42vh"], opacity: [0, 0.55, 0] }}
              className="pointer-events-none absolute h-px w-full bg-white/25"
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
            />
            <div className="relative z-20 px-4 text-center">
              <TextScramble
                as="h1"
                characterSet="VIDCHAIN01<>/{}[]#$"
                className="font-mono text-4xl font-black uppercase tracking-wide text-white md:text-7xl"
                duration={1.35}
                onScrambleComplete={finishIntro}
                speed={0.025}
              >
                Welcome To VidChain
              </TextScramble>
              <p className="mt-5 font-mono text-xs uppercase tracking-[0.45em] text-white/45">
                Origin proof online
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden border-b border-white/10 bg-black">
        <BackgroundBoxes className="z-0" cols={26} rows={36} />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.08)_45%,rgba(0,0,0,0.62)_100%)]" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.64)_0%,rgba(0,0,0,0.08)_28%,rgba(0,0,0,0.08)_58%,rgba(0,0,0,0.78)_100%)]" />

        <div className="pointer-events-none relative z-20 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_12px_42px_rgba(0,0,0,0.75)] md:text-7xl lg:text-8xl">
            Prove where a viral video started.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
            Register originals. Check reposts. Share proof.
          </p>

          <div className="pointer-events-auto mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <FramelessGetStarted />
          </div>
        </div>
      </section>

      <section id="tutorial" className="relative overflow-hidden border-b border-white/10 bg-[#050509] px-4 py-20 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(124,58,237,0.18),transparent_28%),radial-gradient(circle_at_78%_58%,rgba(14,165,233,0.14),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <motion.div
            className="lg:sticky lg:top-28"
            initial={{ opacity: 0, y: 42 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ amount: 0.35, once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-300">How it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              Two flows. One proof network.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
              Hover each step title. The tutorial preview follows your cursor, so the flow stays compact and easy to scan.
            </p>

            <LeverSwitch
              checked={tutorialMode === "check"}
              className="mt-8"
              onCheckedChange={(checked) => setTutorialMode(checked ? "check" : "register")}
            />
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 52, scale: 0.97 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ amount: 0.28, once: true }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div>
              <div>
                <div className="mb-7 flex items-start gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-[0_0_32px_rgba(255,255,255,0.16)]">
                    {tutorialMode === "register" ? <Fingerprint /> : <ScanSearch />}
                  </span>
                  <div>
                    <h3 className="text-2xl font-black text-white md:text-3xl">{tutorial.title}</h3>
                    <p className="mt-2 max-w-xl leading-7 text-zinc-400">{tutorial.description}</p>
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                  {tutorial.steps.map((step, index) => (
                    <motion.div
                      className="group border-t border-white/10 py-5"
                      initial={{ opacity: 0, y: 26 }}
                      key={step.title}
                      transition={{ delay: index * 0.1, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
                      viewport={{ amount: 0.5, once: true }}
                      whileInView={{ opacity: 1, y: 0 }}
                    >
                      <button
                        className="flex w-full items-start gap-4 text-left outline-none"
                        onBlur={() => setHoveredStep(null)}
                        onFocus={() => setHoveredStep(index)}
                        onMouseEnter={() => setHoveredStep(index)}
                        onMouseLeave={() => setHoveredStep(null)}
                        type="button"
                      >
                        <span className="mt-1 font-mono text-xs font-bold text-cyan-200/60 transition group-hover:text-cyan-200">
                          0{index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-2xl font-black tracking-tight text-white transition group-hover:translate-x-1 group-hover:text-cyan-100">
                            {step.title}
                          </span>
                          <span className="mt-2 block max-w-xl text-sm leading-6 text-zinc-500 transition group-hover:text-zinc-300">
                            {step.detail}
                          </span>
                        </span>
                        <span className="ml-auto hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black opacity-0 transition group-hover:opacity-100 md:grid">
                          {step.icon}
                        </span>
                      </button>
                    </motion.div>
                  ))}
                </div>

                <TryNowButton />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}

function FramelessGetStarted() {
  const { loginWithGoogle, isLoggedIn, isLoading } = useAuth();
  if (isLoggedIn) {
    return (
      <Link
        className="group relative inline-flex h-14 items-center gap-4 overflow-hidden rounded-full px-1.5 pr-7 text-white outline-none transition duration-500 hover:-translate-y-1 hover:shadow-[0_0_48px_rgba(168,85,247,0.34)]"
        href={routes.dashboard}
      >
        <span className="absolute inset-0 rounded-full bg-white/0 transition duration-500 group-hover:bg-white" />
        <span className="absolute -left-14 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-violet-500/0 transition-all duration-700 ease-out group-hover:left-0 group-hover:h-64 group-hover:w-[130%] group-hover:bg-violet-500/90" />
        <span className="absolute inset-x-8 bottom-0 h-px bg-white/45 transition duration-500 group-hover:inset-x-0 group-hover:bg-violet-200/0" />
        <motion.span
          animate={{ x: [0, 5, 0] }}
          className="relative grid h-12 w-12 place-items-center rounded-full border border-white/18 bg-white/0 text-white/80 transition duration-500 group-hover:border-black/10 group-hover:bg-black group-hover:text-white"
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
        >
          <ArrowRight size={21} />
        </motion.span>
        <span className="relative text-base font-black tracking-tight text-white transition duration-500 group-hover:translate-x-1 group-hover:text-black">
          Go to Dashboard
        </span>
      </Link>
    );
  }
  return (
    <button
      className="group relative inline-flex h-14 items-center gap-4 overflow-hidden rounded-full px-1.5 pr-7 text-white outline-none transition duration-500 hover:-translate-y-1 hover:shadow-[0_0_48px_rgba(168,85,247,0.34)] disabled:opacity-60"
      disabled={isLoading}
      type="button"
      onClick={() => void loginWithGoogle()}
    >
      <span className="absolute inset-0 rounded-full bg-white/0 transition duration-500 group-hover:bg-white" />
      <span className="absolute -left-14 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-violet-500/0 transition-all duration-700 ease-out group-hover:left-0 group-hover:h-64 group-hover:w-[130%] group-hover:bg-violet-500/90" />
      <span className="absolute inset-x-8 bottom-0 h-px bg-white/45 transition duration-500 group-hover:inset-x-0 group-hover:bg-violet-200/0" />
      <motion.span
        animate={{ x: [0, 5, 0] }}
        className="relative grid h-12 w-12 place-items-center rounded-full border border-white/18 bg-white/0 text-white/80 transition duration-500 group-hover:border-black/10 group-hover:bg-black group-hover:text-white"
        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
      >
        <ArrowRight size={21} />
      </motion.span>
      <span className="relative text-base font-black tracking-tight text-white transition duration-500 group-hover:translate-x-1 group-hover:text-black">
        Get Started
      </span>
    </button>
  );
}

function TryNowButton() {
  const { loginWithGoogle, isLoading } = useAuth();
  return (
    <button
      className="group relative mt-10 inline-flex h-12 items-center gap-3 overflow-hidden rounded-full border border-white/10 px-5 text-sm font-black text-white outline-none transition duration-500 hover:-translate-y-1 hover:border-violet-200/50 hover:shadow-[0_0_44px_rgba(124,58,237,0.32)] disabled:opacity-60"
      disabled={isLoading}
      type="button"
      onClick={() => void loginWithGoogle()}
    >
      <span className="absolute inset-0 bg-white/[0.035]" />
      <span className="absolute inset-y-0 left-0 w-0 bg-white transition-all duration-500 ease-out group-hover:w-full" />
      <span className="absolute -right-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-violet-400/70 opacity-0 blur-md transition-all duration-700 group-hover:right-6 group-hover:opacity-100" />
      <span className="relative transition duration-500 group-hover:text-black">Try Now</span>
      <motion.span
        animate={{ x: [0, 4, 0] }}
        className="relative grid h-8 w-8 place-items-center rounded-full bg-white text-black transition duration-500 group-hover:bg-black group-hover:text-white"
        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
      >
        <ArrowRight size={15} />
      </motion.span>
    </button>
  );
}

function VideoCursor({ hoveredStep, mode }: { hoveredStep: number | null; mode: TutorialMode }) {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let frame = 0;
    const move = (event: MouseEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        cursor.style.transform = `translate3d(${event.clientX - 18}px, ${event.clientY - 18}px, 0)`;
      });
    };

    window.addEventListener("mousemove", move, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", move);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-9 w-9 place-items-center rounded-full border border-violet-200/50 bg-black/75 text-violet-100 shadow-[0_0_24px_rgba(124,58,237,0.45)] backdrop-blur-md md:grid"
      ref={cursorRef}
    >
      <Plus size={19} strokeWidth={2.7} />
      <AnimatePresence>
        {hoveredStep !== null ? (
          <motion.div
            animate={{ opacity: 1, x: 0, scale: 1.06 }}
            className="absolute right-12 top-2 w-80 overflow-hidden rounded-3xl bg-[#07080d]/95 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-2xl"
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            key={`${mode}-${hoveredStep}`}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <CursorStepPreview index={hoveredStep} mode={mode} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CursorStepPreview({ index, mode }: { index: number; mode: TutorialMode }) {
  const isRegister = mode === "register";
  const data = [
    {
      label: isRegister ? "Upload original" : "Upload repost",
      icon: <Upload size={22} />,
      accent: "from-cyan-300/40 to-violet-500/20",
      body: <MiniUploadPreview isRegister={isRegister} />
    },
    {
      label: isRegister ? "Generate fingerprint" : "Generate signature",
      icon: <Fingerprint size={22} />,
      accent: "from-violet-300/40 to-cyan-500/20",
      body: <MiniFingerprintPreview isRegister={isRegister} />
    },
    {
      label: isRegister ? "Anchor proof" : "Compare proof",
      icon: isRegister ? <BadgeCheck size={22} /> : <ScanSearch size={22} />,
      accent: "from-emerald-300/35 to-cyan-500/20",
      body: <MiniCertificatePreview isRegister={isRegister} />
    },
    {
      label: isRegister ? "Share certificate" : "Open origin",
      icon: isRegister ? <Share2 size={22} /> : <Link2 size={22} />,
      accent: "from-pink-300/35 to-violet-500/20",
      body: <MiniSharePreview isRegister={isRegister} />
    }
  ][index];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-black">
            {data.icon}
          </span>
          <div>
            <p className="text-sm font-black text-white">{data.label}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/55">Step 0{index + 1}</p>
          </div>
        </div>
      </div>
      <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-3", data.accent)}>
        {data.body}
      </div>
    </div>
  );
}

function MiniUploadPreview({ isRegister }: { isRegister: boolean }) {
  return (
    <div className="grid aspect-video place-items-center rounded-xl bg-black/45">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-black"
        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
      >
        <Upload size={24} />
      </motion.div>
      <p className="absolute bottom-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/65">
        {isRegister ? "original.mp4" : "repost.mp4"}
      </p>
    </div>
  );
}

function MiniFingerprintPreview({ isRegister }: { isRegister: boolean }) {
  return (
    <div className="relative grid aspect-video place-items-center rounded-xl bg-black/45">
      <Fingerprint className="text-cyan-100" size={54} />
      <motion.div
        animate={{ y: ["-260%", "260%", "-260%"] }}
        className="absolute h-px w-full bg-cyan-100 shadow-[0_0_16px_rgba(125,211,252,0.9)]"
        transition={{ duration: 1.35, ease: "easeInOut", repeat: Infinity }}
      />
      <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] text-cyan-100">
        {isRegister ? "SHA + pHash" : "match scan"}
      </span>
    </div>
  );
}

function MiniCertificatePreview({ isRegister }: { isRegister: boolean }) {
  return (
    <div className="grid aspect-video place-items-center rounded-xl bg-black/45">
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        className="rounded-2xl bg-white px-5 py-4 text-center text-black"
        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
      >
        <BadgeCheck className="mx-auto" size={26} />
        <p className="mt-1 text-xs font-black">{isRegister ? "Proof ready" : "Origin found"}</p>
      </motion.div>
    </div>
  );
}

function MiniSharePreview({ isRegister }: { isRegister: boolean }) {
  return (
    <div className="grid aspect-video content-center gap-3 rounded-xl bg-black/45 p-4">
      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-black">
        {isRegister ? <Share2 size={16} /> : <Link2 size={16} />}
        <span className="truncate font-mono text-[10px]">vidchain.id/cert/...</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["Copy", "Open", "Share"].map((item) => (
          <span className="rounded-full bg-white/10 py-1 text-center text-[10px] font-bold text-white" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

