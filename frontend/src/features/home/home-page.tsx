"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, HTMLAttributes, PointerEvent, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  FileVideo,
  Fingerprint,
  Flag,
  Lightbulb,
  ScanSearch,
  Shield,
  Stamp,
  Upload,
  Video,
  Volume2,
  VolumeX,
  WalletCards
} from "lucide-react";
import { TextScramble } from "@/components/ui/text-scramble";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { EntryExperience } from "./entry/entry-experience";
import { OptimizedBackgroundCanvas } from "./backgrounds/optimized-background-canvas";
import { CursorTrailCanvas } from "./systems/cursor-trail-canvas";
import { MasterLoop } from "./systems/master-loop";
import { SectionProxy } from "./systems/section-proxy";

type SectionId = "hero" | "problem" | "solution" | "how" | "phash" | "dispute" | "cta";

const sections: { id: SectionId; label: string }[] = [
  { id: "hero", label: "Start" },
  { id: "problem", label: "The Risk" },
  { id: "solution", label: "The Fix" },
  { id: "how", label: "Steps" },
  { id: "phash", label: "Copy Check" },
  { id: "dispute", label: "Report" },
  { id: "cta", label: "Try It" }
];

const sectionTints: Record<SectionId, string> = {
  cta: "#080712",
  dispute: "#120810",
  hero: "#080712",
  how: "#0a0812",
  phash: "#08120a",
  problem: "#120808",
  solution: "#081212"
};

function isSectionId(value: string): value is SectionId {
  return sections.some((section) => section.id === value);
}

export function HomePage() {
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [entryRevealed, setEntryRevealed] = useState(false);
  const [loadedSections, setLoadedSections] = useState<SectionId[]>(["hero"]);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target.id && isSectionId(visible.target.id)) setActiveSection(visible.target.id);
      },
      { threshold: 0.44 }
    );
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--vidchain-bg", sectionTints[activeSection]);
  }, [activeSection]);

  useEffect(() => {
    const lazySections = loadedSections.map((section) => new SectionProxy(section, () => import("./sections/lifecycle")));
    return () => lazySections.forEach((section) => section.destroy());
  }, [loadedSections]);

  const revealHome = useCallback(() => {
    setEntryRevealed(true);
    const stagedSections: SectionId[] = ["problem", "solution", "how", "phash", "dispute", "cta"];
    stagedSections.forEach((section, index) => {
      window.setTimeout(() => {
        setLoadedSections((current) => (current.includes(section) ? current : [...current, section]));
      }, 520 + index * 420);
    });
  }, []);

  return (
    <main className={cn("home-cinematic relative overflow-hidden bg-[#0A0A0F] text-white", !entryRevealed && "home-entry-locked", entryRevealed && "home-entry-revealed")}>
      <DepthParallax />
      <OptimizedBackgroundCanvas activeSection={activeSection} />
      {entryRevealed ? <CursorTrailCanvas /> : null}
      {entryRevealed ? <LightBulbCursor /> : null}
      {entryRevealed ? <ProgressRail activeSection={activeSection} /> : null}
      <button
        aria-label={soundOn ? "Disable interaction sounds" : "Enable interaction sounds"}
        className="fixed bottom-6 right-6 z-[70] grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/80 text-cyan-100 shadow-[0_0_34px_rgba(103,232,249,0.16)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white hover:text-black"
        onClick={() => setSoundOn((value) => !value)}
        type="button"
      >
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      <HeroSection />
      <SectionSlot id="problem" loaded={loadedSections.includes("problem")} transition="crack"><ProblemSection /></SectionSlot>
      <SectionSlot id="solution" loaded={loadedSections.includes("solution")} transition="vortex"><SolutionSection /></SectionSlot>
      <SectionSlot id="how" loaded={loadedSections.includes("how")} transition="stamp"><HowSection /></SectionSlot>
      <SectionSlot id="phash" loaded={loadedSections.includes("phash")} transition="matrix"><PHashSection /></SectionSlot>
      <SectionSlot id="dispute" loaded={loadedSections.includes("dispute")} transition="chain"><DisputeSection /></SectionSlot>
      <SectionSlot id="cta" loaded={loadedSections.includes("cta")} transition="supernova"><CTASection /></SectionSlot>
      {!entryRevealed ? <EntryExperience onReveal={revealHome} /> : null}
    </main>
  );
}

function SectionSlot({ children, id, loaded, transition }: { children: ReactNode; id: SectionId; loaded: boolean; transition: "chain" | "crack" | "matrix" | "stamp" | "supernova" | "vortex" }) {
  return (
    <>
      {loaded ? <CinematicTransition kind={transition} /> : <div aria-hidden className="home-transition-placeholder" />}
      {loaded ? children : <section aria-hidden className={cn("section home-section-placeholder", `playful-${id}`)} id={id} />}
    </>
  );
}

function HeroSection() {
  return (
    <section className="section hero-section playful-section playful-hero relative min-h-screen overflow-hidden px-4 py-20" id="hero">
      <div className="hero-grid" />
      <HeroOrbs />
      <StarField />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <ScrollReveal>
          <p className="font-mono text-sm font-black uppercase tracking-[0.42em] text-emerald-200">Your content. Protected. Forever.</p>
          <h1 className="mt-6 text-5xl font-black leading-[0.9] tracking-tight md:text-7xl">
            <TextScramble as="span" characterSet="VIDCHAIN01" duration={1.2} speed={0.03}>
              VidChain
            </TextScramble>
            <span className="block text-zinc-300">Own Your Story</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">A simple way for Indonesian creators to prove a video is theirs before it gets copied.</p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <MagneticLink
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-emerald-300 px-7 text-sm font-black text-black shadow-[0_0_70px_rgba(20,241,149,0.28)] transition hover:scale-105"
              href={routes.dashboard}
            >
              Protect My Video
              <ArrowRight size={18} />
            </MagneticLink>
            <MagneticLink className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-violet-300/45 px-7 text-sm font-black text-violet-100 transition hover:bg-white hover:text-black" href="#phash">
              See How It Works
              <ScanSearch size={18} />
            </MagneticLink>
          </div>
        </ScrollReveal>
        <RobotHero />
      </div>
    </section>
  );
}

const HeroOrbs = memo(function HeroOrbs() {
  return (
    <div aria-hidden className="hero-orbs">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
      <div className="orb orb-5" />
    </div>
  );
});

function RobotHero() {
  const pupil1Ref = useRef<HTMLSpanElement | null>(null);
  const pupil2Ref = useRef<HTMLSpanElement | null>(null);
  const [dance, setDance] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const [minted, setMinted] = useState<string | null>(null);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 18 * 0.08;
      const y = (event.clientY / window.innerHeight - 0.5) * 14 * 0.08;
      const t = `translate(${x}px, ${y}px)`;
      if (pupil1Ref.current) pupil1Ref.current.style.transform = t;
      if (pupil2Ref.current) pupil2Ref.current.style.transform = t;
    };
    window.addEventListener("mousemove", move, { passive: true });
    const boredTimer = window.setTimeout(() => setSpeech("Ayo, lindungi videomu"), 30000);
    return () => {
      window.removeEventListener("mousemove", move);
      window.clearTimeout(boredTimer);
    };
  }, []);

  const danceRobot = () => {
    setDance(true);
    setSpeech("Halo, Creator!");
    window.setTimeout(() => setDance(false), 900);
    window.setTimeout(() => setSpeech(null), 1900);
  };

  return (
    <ScrollReveal className="relative min-h-[34rem]">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(153,69,255,0.26),transparent_58%)] blur-2xl" />
      <button className="absolute left-1/2 top-28 z-20 -translate-x-1/2 border-0 bg-transparent p-0" onClick={danceRobot} onDoubleClick={() => setSpeech("Halo, Creator!")} type="button">
        <motion.div
          animate={{
            rotateY: dance ? [0, 35, -35, 360] : 0,
            rotateX: dance ? [0, -12, 12, 0] : 0,
            y: [0, -14, 0],
            scale: dance ? [1, 1.08, 0.98, 1] : [1, 1.02, 1]
          }}
          className="relative h-64 w-56 rounded-[2.5rem] border border-cyan-100/25 bg-black/70 shadow-[0_0_130px_rgba(153,69,255,0.26)] backdrop-blur-xl"
          style={{ transformStyle: "preserve-3d" }}
          transition={{ duration: dance ? 0.9 : 5, ease: "easeInOut", repeat: dance ? 0 : Infinity }}
        >
          <div className="absolute left-1/2 top-5 h-20 w-28 -translate-x-1/2 rounded-[1.6rem] border border-white/15 bg-white/[0.05]" />
          {[-1, 1].map((side, i) => (
            <span className={cn("absolute top-12 grid h-9 w-9 place-items-center rounded-full bg-cyan-100/12", side < 0 ? "left-16" : "right-16")} key={side}>
              <span ref={i === 0 ? pupil1Ref : pupil2Ref} className="h-3.5 w-3.5 rounded-full bg-cyan-100 shadow-[0_0_22px_rgba(165,243,252,0.95)]" />
            </span>
          ))}
          <motion.div animate={{ scale: [1, 1.12, 1] }} className="absolute left-1/2 top-32 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-2xl bg-emerald-300 text-black shadow-[0_0_60px_rgba(20,241,149,0.45)]" transition={{ duration: 2.2, repeat: Infinity }}>
            <Shield size={30} />
          </motion.div>
          <div className="absolute bottom-7 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-cyan-100 shadow-[0_0_24px_rgba(165,243,252,0.65)]" />
          <motion.div animate={{ rotate: 360 }} className="absolute -inset-12 rounded-full border border-dashed border-emerald-200/20" transition={{ duration: 30, ease: "linear", repeat: Infinity }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {speech ? (
          <motion.p animate={{ opacity: 1, y: 0 }} className="absolute left-1/2 top-14 z-30 w-max -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-black text-black" exit={{ opacity: 0, y: -10 }} initial={{ opacity: 0, y: 10 }}>
            {speech}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {["Musik", "Kuliner", "Gaming"].map((label, index) => (
        <motion.button
          animate={{ rotate: [0, 360], x: [0, index === 1 ? -18 : 18, 0], y: [0, index === 2 ? 18 : -18, 0] }}
          className="absolute z-30 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-xs font-black text-white backdrop-blur-xl transition hover:scale-125 hover:bg-white hover:text-black"
          key={label}
          onClick={() => {
            setMinted(label);
            window.setTimeout(() => setMinted(null), 1200);
          }}
          style={{ left: `${index * 30 + 11}%`, top: `${index % 2 === 0 ? 16 : 72}%` }}
          transition={{ delay: index * 0.35, duration: 9 + index * 2, ease: "linear", repeat: Infinity }}
          type="button"
        >
          {label}
          <span className="block text-[10px] text-emerald-200">Protected by VidChain</span>
        </motion.button>
      ))}
      <AnimatePresence>
        {minted ? (
          <motion.div animate={{ opacity: 1, scale: 1 }} className="absolute bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-black" exit={{ opacity: 0, scale: 0.8 }} initial={{ opacity: 0, scale: 0.8 }}>
            {minted} protected
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ScrollReveal>
  );
}

const StolenCounter = memo(function StolenCounter() {
  const [count, setCount] = useState(1284);
  useEffect(() => {
    const timer = window.setInterval(() => setCount((v) => v + 7), 1200);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <p className="mt-6 rounded-full border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">{count.toLocaleString()} videos stolen today</p>
  );
});

function ProblemSection() {
  const [dropState, setDropState] = useState<"idle" | "safe" | "danger">("idle");

  return (
    <StorySection eyebrow="The problem" id="problem" tone="red" title="Every day, creators lose their work to theft.">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <ScrollReveal>
          <p className="max-w-xl text-lg leading-8 text-zinc-300">Indonesia has hundreds of millions online. When a video goes viral without proof, ownership gets blurry fast.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["204M", "internet users"],
              ["127M", "TikTok reach"],
              ["$1.3B", "creator economy"]
            ].map(([value, label]) => (
              <CursorGlow className="rounded-2xl border border-red-200/15 bg-red-500/[0.06] p-4" key={label}>
                <p className="text-3xl font-black text-red-100">{value}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
              </CursorGlow>
            ))}
          </div>
          <StolenCounter />
        </ScrollReveal>
        <ScrollReveal>
          <CursorGlow className="relative min-h-[32rem] overflow-hidden rounded-[2rem] border border-red-300/15 bg-black/60 p-5">
            <div className="absolute inset-y-5 left-5 w-[42%] rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
              <Shield className="text-emerald-200" />
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.24em] text-emerald-200">Safe zone</p>
            </div>
            <div className="absolute inset-y-5 right-5 w-[42%] rounded-3xl border border-red-300/20 bg-red-500/[0.05] p-4 text-right">
              <Flag className="ml-auto text-red-200" />
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.24em] text-red-200">No proof zone</p>
            </div>
            <motion.div
              className={cn("absolute left-1/2 top-24 z-10 h-52 w-72 -translate-x-1/2 cursor-grab overflow-hidden rounded-3xl border border-white/12 bg-black/80 shadow-[0_30px_90px_rgba(0,0,0,0.45)] active:cursor-grabbing", dropState === "safe" && "border-emerald-200/70", dropState === "danger" && "border-red-200/70")}
              drag
              dragConstraints={{ bottom: 130, left: -210, right: 210, top: -24 }}
              onDragEnd={(_, info) => {
                if (info.point.x > window.innerWidth * 0.55) setDropState("danger");
                else if (info.point.x < window.innerWidth * 0.45) setDropState("safe");
              }}
              whileDrag={{ scale: 1.05, rotate: 3 }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),transparent)]" />
              <Video className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80" size={62} />
              <p className="absolute bottom-5 left-5 text-sm font-black">Drag the video</p>
              {dropState === "safe" ? <p className="absolute right-5 top-5 rounded-full bg-emerald-200 px-3 py-1 text-xs font-black text-black">Protected</p> : null}
              {dropState === "danger" ? <ShatterParticles /> : null}
            </motion.div>
          </CursorGlow>
        </ScrollReveal>
      </div>
    </StorySection>
  );
}

function SolutionSection() {
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [autoDemo, setAutoDemo] = useState(false);
  const stageTimersRef = useRef<number[]>([]);

  const clearStageTimers = useCallback(() => {
    stageTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    stageTimersRef.current = [];
  }, []);

  const runMintSequence = useCallback(() => {
    clearStageTimers();
    setStage(1);
    [2, 3, 4, 5].forEach((nextStage, index) => {
      const timer = window.setTimeout(() => setStage(nextStage), 700 + index * 680);
      stageTimersRef.current.push(timer);
    });
  }, [clearStageTimers]);

  const loadFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview(reader.result);
        setAutoDemo(false);
        runMintSequence();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    loadFile(event.dataTransfer.files[0]);
  };

  useEffect(() => {
    if (stage > 0 || preview) return;
    const timer = window.setTimeout(() => {
      setAutoDemo(true);
      runMintSequence();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [preview, runMintSequence, stage]);

  useEffect(() => clearStageTimers, [clearStageTimers]);

  return (
    <StorySection eyebrow="The fix" id="solution" tone="green" title="VidChain saves proof people can check later.">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <ScrollReveal>
          <GuardianMini />
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">Upload one video and get a public proof page with the owner, time, file fingerprint, and Solana record.</p>
          <CursorGlow className="mt-6 rounded-2xl border border-emerald-200/15 bg-black/60 p-4 font-mono text-sm text-emerald-100">
            <Typewriter text="sha256: 4f8a91bc9d1c77aa0e5b... anchored_to_solana" />
          </CursorGlow>
        </ScrollReveal>
        <ScrollReveal>
          <CursorGlow className={cn("relative min-h-[35rem] rounded-[2rem] border border-dashed border-emerald-200/25 bg-black/60 p-5", stage > 0 && "border-solid border-violet-300/60 shadow-[0_0_90px_rgba(153,69,255,0.14)]")} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <div className="grid min-h-[12rem] place-items-center rounded-3xl border border-dashed border-emerald-200/25 bg-emerald-300/[0.04] text-center">
              <div>
                <Upload className="mx-auto text-emerald-200" size={34} />
                <p className="mt-3 font-black">Drop a video here to protect it</p>
                <p className="mt-2 text-sm text-zinc-500">The demo checks the file, creates a fingerprint, and makes a sample proof page.</p>
                <motion.p animate={{ x: [0, 12, 0] }} className="mt-4 font-mono text-xs font-black uppercase tracking-[0.22em] text-emerald-200" transition={{ duration: 1.4, repeat: Infinity }}>
                  Drop image or wait for auto-demo
                </motion.p>
              </div>
            </div>
            <motion.div className="absolute bottom-5 left-1/2 w-72 -translate-x-1/2 cursor-grab rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl active:cursor-grabbing" drag dragConstraints={{ bottom: 20, left: -140, right: 140, top: -250 }}>
              {stage > 0 ? <span className="absolute right-4 top-4 z-10 rounded-full bg-emerald-300 px-3 py-1 text-[10px] font-black text-black">RECEIVED</span> : null}
              {preview ? <img alt="Proof preview" className="h-36 w-full rounded-2xl object-cover" src={preview} /> : <div className="grid h-36 place-items-center rounded-2xl bg-[radial-gradient(circle,rgba(153,69,255,0.25),rgba(2,6,23,0.9))]"><Fingerprint className="text-emerald-200" size={42} />{autoDemo ? <span className="absolute top-24 text-xs font-black text-white/70">Demo video</span> : null}</div>}
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">Proof step {stage}/5</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div animate={{ width: `${stage * 20}%` }} className="h-full bg-emerald-300 shadow-[0_0_24px_rgba(20,241,149,0.8)]" />
              </div>
              {stage >= 2 ? (
                <div className="mt-3 rounded-2xl border border-emerald-200/15 bg-black/60 p-3 font-mono text-[10px] leading-5 text-emerald-100">
                  <p>{stage >= 2 ? "ok sha256: 4f8a91bc9d1c77aa" : "..."}</p>
                  <p>{stage >= 3 ? "ok visual match: 1101001110010110" : "creating video fingerprint..."}</p>
                  <p>{stage >= 4 ? "writing to Solana..." : "analyzing pixels..."}</p>
                </div>
              ) : null}
              {stage >= 5 ? (
                <div>
                  <motion.p animate={{ scale: [0.85, 1.08, 1], rotate: [-4, 2, 0] }} className="mt-4 rounded-full bg-emerald-300 px-4 py-2 text-center text-xs font-black text-black">PROTECTED</motion.p>
                  <button className="mt-3 w-full rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/80 transition hover:bg-white hover:text-black" onClick={() => { clearStageTimers(); setPreview(null); setStage(0); setAutoDemo(false); }} type="button">
                    Protect Another
                  </button>
                </div>
              ) : null}
              {stage > 0 && stage < 5 ? <motion.div animate={{ y: ["0%", "420%"] }} className="absolute left-4 right-4 top-4 h-1 bg-emerald-200 shadow-[0_0_24px_rgba(20,241,149,0.9)]" transition={{ duration: 1.2, repeat: Infinity }} /> : null}
            </motion.div>
          </CursorGlow>
        </ScrollReveal>
      </div>
    </StorySection>
  );
}

function HowSection() {
  const [active, setActive] = useState<number | null>(null);
  const cards = [
    { title: "Connect Your Account", body: "Use Google or a wallet. No long setup needed.", icon: <WalletCards /> },
    { title: "Upload Your Video", body: "VidChain creates a unique file fingerprint and proof page.", icon: <Upload /> },
    { title: "Keep Proof Ready", body: "Anyone can check the proof link when ownership is questioned.", icon: <Stamp /> }
  ];

  return (
    <StorySection eyebrow="Three easy steps" id="how" tone="purple" title="Connect. Upload. Keep proof ready.">
      <div className="grid gap-8">
        <div className="relative grid gap-5 lg:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-1/2 hidden h-px bg-gradient-to-r from-zinc-700 via-violet-400 to-emerald-300 lg:block" />
          {cards.map((card, index) => (
            <motion.button
              className="cursor-glow-card group relative min-h-80 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 text-left backdrop-blur-xl"
              key={card.title}
              onClick={() => setActive(index)}
              style={{ transformStyle: "preserve-3d" }}
              type="button"
              whileHover={{ rotateX: 7, rotateY: index === 1 ? 0 : index === 0 ? -10 : 10, y: -12 }}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-black transition group-hover:bg-emerald-300">{card.icon}</span>
              <p className="mt-8 font-mono text-xs uppercase tracking-[0.24em] text-violet-200/60">0{index + 1}</p>
              <h3 className="mt-3 text-3xl font-black">{card.title}</h3>
              <p className="mt-4 leading-7 text-zinc-400">{card.body}</p>
              {active === index ? <motion.p animate={{ scale: [0.9, 1.06, 1] }} className="mt-6 inline-flex rounded-full bg-emerald-300 px-3 py-2 text-xs font-black text-black">{index === 0 ? "Connected: 2.45 SOL" : index === 1 ? "sha256: 7f83b1..." : "VERIFIED"}</motion.p> : null}
              {index === 1 ? <PixelHash active={active === index} /> : null}
            </motion.button>
          ))}
        </div>
        <SpeedChallenge />
      </div>
    </StorySection>
  );
}

function PHashSection() {
  const [scanned, setScanned] = useState(false);

  return (
    <StorySection eyebrow="Copy check" id="phash" tone="cyan" title="Even edited copies can still be found.">
      <CursorGlow className="relative overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-black/70 p-5">
        <MatrixRain />
        <div className="relative grid gap-5 md:grid-cols-2">
          {["Original Video", "Stolen Re-encoded Video"].map((label, index) => (
            <CursorGlow className={cn("relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5", index === 1 && "hash-glitch")} key={label}>
              <div className="grid h-56 place-items-center rounded-2xl bg-[radial-gradient(circle,rgba(153,69,255,0.28),rgba(2,6,23,0.9))]">
                <FileVideo className={index === 0 ? "text-cyan-100" : "text-red-200"} size={58} />
              </div>
              <h3 className="mt-5 text-2xl font-black">{label}</h3>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{scanned ? `File ${index === 0 ? "OK" : "CHANGED"} / Visual match found` : "Waiting for scan"}</p>
              {scanned ? <motion.div animate={{ x: ["-20%", "120%"] }} className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-transparent via-emerald-200/24 to-transparent" transition={{ duration: 0.9, repeat: 2 }} /> : null}
            </CursorGlow>
          ))}
          <button className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/45 bg-black text-sm font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_70px_rgba(103,232,249,0.28)] transition hover:scale-110 hover:bg-cyan-100 hover:text-black" onClick={() => setScanned(true)} type="button">
            Scan
          </button>
        </div>
        {scanned ? (
          <div className="relative mt-6 grid gap-4 md:grid-cols-2">
            <Meter label="Hamming distance" value="4 / 64" width="12%" />
            <Meter label="Match probability" value="94%" width="94%" />
          </div>
        ) : null}
        <SpotTheFakeGame />
      </CursorGlow>
    </StorySection>
  );
}

function DisputeSection() {
  const [caught, setCaught] = useState(false);

  return (
    <StorySection eyebrow="Report copied videos" id="dispute" tone="red" title="Show your proof when someone steals your work.">
      <CursorGlow className="relative min-h-[34rem] overflow-hidden rounded-[2rem] border border-red-200/15 bg-black/70 p-5">
        <motion.button animate={caught ? { x: 240, scale: [1, 1.16, 1] } : { x: [0, 520, 0], y: [0, -18, 0] }} className={cn("absolute left-6 top-16 z-20 grid h-24 w-24 place-items-center rounded-3xl border text-red-100", caught ? "border-red-200 bg-red-500/35" : "border-white/10 bg-red-500/12")} onClick={() => setCaught(true)} transition={{ duration: caught ? 0.7 : 6, repeat: caught ? 0 : Infinity }} type="button">
          <Flag size={34} />
        </motion.button>
        <CursorGlow className="ml-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">Live proof log</p>
          {(caught ? ["10:42 | copied video | report sent | risk marked", "10:42 | creator proof | checked and matched", "10:43 | vidchain | evidence saved | public"] : ["waiting for copied video", "creator proof is ready", "click the moving report flag"]).map((line, index) => (
            <motion.p animate={{ opacity: [0.45, 1, 0.45] }} className="mt-4 font-mono text-sm text-cyan-100" key={line} transition={{ delay: index * 0.22, duration: 2.3, repeat: Infinity }}>
              {">"} {line}
            </motion.p>
          ))}
          <div className="mt-8 grid gap-4">
            <ReputationBar label="Copier" value={caught ? 10 : 50} tone="red" />
            <ReputationBar label="Creator" value={caught ? 95 : 70} tone="green" />
          </div>
        </CursorGlow>
        <motion.div animate={{ scale: caught ? [1, 1.35, 1.12] : [1, 1.08, 1] }} className="absolute bottom-12 left-14 text-emerald-200" transition={{ duration: 2, repeat: Infinity }}>
          <Shield size={90} />
        </motion.div>
      </CursorGlow>
      <JudgeMode />
    </StorySection>
  );
}

function SpeedChallenge() {
  const [running, setRunning] = useState(false);
  const [manualProgress, setManualProgress] = useState(0);
  const [solanaDone, setSolanaDone] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [tripped, setTripped] = useState(false);

  useEffect(() => {
    if (!running || stopped) return;
    const timer = window.setInterval(() => {
      setManualProgress((value) => Math.min(100, value + 0.34));
    }, 100);
    return () => window.clearInterval(timer);
  }, [running, stopped]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setSolanaDone(true), 400);
    return () => window.clearTimeout(timer);
  }, [running]);

  const start = () => {
    setRunning(true);
    setManualProgress(0);
    setSolanaDone(false);
    setStopped(false);
    setTripped(false);
  };

  return (
    <CursorGlow className="relative overflow-hidden rounded-[2rem] border border-violet-200/15 bg-black/65 p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(20,241,149,0.14),transparent_28%)]" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-violet-200">Proof speed check</p>
          <h3 className="mt-2 text-3xl font-black">Save ownership proof to a wallet</h3>
        </div>
        <motion.button animate={{ boxShadow: ["0 0 0 rgba(153,69,255,0)", "0 0 44px rgba(153,69,255,0.45)", "0 0 0 rgba(153,69,255,0)"] }} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black" onClick={start} transition={{ duration: 1.6, repeat: Infinity }} type="button">
          Start Check
        </motion.button>
      </div>
      <div className="relative mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-zinc-300">Manual file handoff</p>
            <motion.button animate={tripped ? { rotate: [0, -28, 12, 0], y: [0, 12, 0] } : { rotate: [-3, 3, -3] }} className="rounded-full border border-orange-200/20 px-3 py-1 text-xl" onClick={() => setTripped(true)} transition={{ duration: tripped ? 0.55 : 1.1, repeat: tripped ? 0 : Infinity }} type="button">
              ZIP
            </motion.button>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black">FILE</span>
            <div className="h-px flex-1 bg-white/10" />
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-xs font-black">INBOX</span>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
            <motion.div animate={{ width: stopped ? "0%" : `${manualProgress}%` }} className="h-full rounded-full bg-orange-300/70" />
          </div>
          <p className="mt-3 text-sm text-zinc-500">{running ? `${Math.max(1, Math.floor(manualProgress * 0.3))} checks... metadata still unclear` : "Dragging files, checking names, confirming manually"}</p>
          {running && !stopped ? (
            <button className="mt-4 rounded-full border border-red-200/25 px-4 py-2 text-xs font-black text-red-100 transition hover:bg-red-200 hover:text-black" onClick={() => setStopped(true)} type="button">
              Stop manual handoff
            </button>
          ) : null}
        </div>
        <div className="rounded-3xl border border-emerald-200/20 bg-emerald-300/[0.06] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-emerald-100">Wallet proof update</p>
            <motion.span animate={running ? { x: [0, 8, 0], scale: [1, 1.22, 1] } : undefined} className="text-2xl" transition={{ duration: 0.4, repeat: running && !solanaDone ? Infinity : 0 }}>
              PROOF
            </motion.span>
          </div>
          <div className="relative mt-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-200/25 bg-emerald-300/10 text-xs font-black">PROOF</span>
            <div className="h-px flex-1 bg-emerald-200/25" />
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-200/25 bg-emerald-300/10 text-xs font-black">WALLET</span>
            {running ? <motion.span animate={{ left: ["3rem", "calc(100% - 6rem)"], opacity: [0, 1, 0] }} className="absolute top-3 grid h-6 w-12 place-items-center rounded bg-emerald-300 text-[10px] font-black text-black" transition={{ duration: 0.4, ease: "easeOut" }}>PROOF</motion.span> : null}
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
            <motion.div animate={{ width: running ? "100%" : "0%" }} className="h-full rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(20,241,149,0.8)]" transition={{ duration: 0.4, ease: "easeOut" }} />
          </div>
          <AnimatePresence>
            {solanaDone ? (
              <motion.p animate={{ opacity: 1, scale: 1 }} className="mt-3 text-lg font-black text-emerald-200" exit={{ opacity: 0 }} initial={{ opacity: 0, scale: 0.8 }}>
                Proof saved in 400ms.
              </motion.p>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Saving ownership proof...</p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </CursorGlow>
  );
}

function SpotTheFakeGame() {
  const sides: ("left" | "right")[] = ["left", "right"];
  const rounds = [
    { artifact: "warmer colors and cropped edge", difficulty: "Easy", hint: "Color temperature", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80", stolenClass: "scale-105 sepia-[0.25] saturate-75 contrast-110" },
    { artifact: "compression blocks in the shadows", difficulty: "Medium", hint: "Compression artifacts", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80", stolenClass: "scale-110 saturate-50 contrast-125 blur-[0.6px]" },
    { artifact: "tiny crop and re-encode shift", difficulty: "Hard", hint: "Nearly identical", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", stolenClass: "scale-[1.025] saturate-90 contrast-105" }
  ];
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<"left" | "right" | null>(null);
  const complete = round >= rounds.length;
  const current = rounds[Math.min(round, rounds.length - 1)];
  const correct = picked === "left";

  const pick = (side: "left" | "right") => {
    if (picked || complete) return;
    setPicked(side);
    if (side === "left") setScore((value) => value + 1);
  };

  const next = () => {
    setPicked(null);
    setRound((value) => value + 1);
  };

  return (
    <div className="relative mt-8 rounded-[2rem] border border-cyan-200/15 bg-black/55 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Spot the fake</p>
          <h3 className="mt-2 text-3xl font-black">Can you tell which clip is original?</h3>
        </div>
        <p className="rounded-full border border-cyan-200/20 px-4 py-2 text-sm font-black text-cyan-100">{complete ? "VidChain found all 3 copies" : `Round ${round + 1}/3 - ${current.difficulty}`}</p>
      </div>
      {complete ? (
        <motion.div animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-3xl border border-emerald-200/20 bg-emerald-300/[0.08] p-5" initial={{ opacity: 0, y: 18 }}>
          <p className="text-3xl font-black">{score}/3 correct</p>
          <p className="mt-2 text-zinc-300">VidChain matched all three in 50ms, including the hard one humans barely notice.</p>
          <button className="mt-5 rounded-full bg-cyan-100 px-5 py-3 text-sm font-black text-black" onClick={() => { setRound(0); setScore(0); setPicked(null); }} type="button">
            Play Again
          </button>
        </motion.div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {sides.map((side) => (
              <motion.button
                animate={picked === side && side === "right" ? { x: [-7, 7, -5, 5, 0] } : undefined}
                className={cn("relative overflow-hidden rounded-3xl border p-4 text-left transition", picked === side ? (side === "left" ? "border-emerald-200 bg-emerald-300/[0.08]" : "border-red-200 bg-red-500/[0.08]") : "border-white/10 bg-white/[0.035]")}
                key={side}
                onClick={() => pick(side)}
                type="button"
                whileHover={{ scale: 1.015 }}
              >
                <div className="relative h-52 overflow-hidden rounded-2xl bg-zinc-950">
                  <Image alt={side === "left" ? "Original video thumbnail" : "Re-encoded stolen copy thumbnail"} className={cn("object-cover transition duration-500", side === "right" && current.stolenClass)} fill sizes="(max-width: 768px) 100vw, 50vw" src={current.image} />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.72))]" />
                  {side === "right" ? <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_8px)] opacity-25" /> : null}
                  <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/55 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85">{side === "left" ? "Source upload" : "Repost copy"}</div>
                  <Video className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/86 drop-shadow-[0_0_18px_rgba(0,0,0,0.7)]" size={48} />
                  <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px]">00:12</span>
                  {picked && side === "right" ? (
                    <>
                      <span className="absolute left-8 top-12 h-12 w-12 rounded-full border-2 border-red-300 shadow-[0_0_24px_rgba(248,113,113,0.7)]" />
                      <span className="absolute bottom-12 right-14 h-10 w-10 rounded-full border-2 border-red-300 shadow-[0_0_24px_rgba(248,113,113,0.7)]" />
                    </>
                  ) : null}
                </div>
                <p className="mt-4 text-xl font-black">{side === "left" ? "Clip A" : "Clip B"}</p>
                <p className="mt-1 text-sm text-zinc-500">{side === "left" ? "Original candidate" : `Possible copy: ${current.artifact}`}</p>
              </motion.button>
            ))}
          </div>
          {picked ? (
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className={cn("font-black", correct ? "text-emerald-200" : "text-red-200")}>{correct ? "Correct. But imagine checking 1 million videos." : "Even experts get fooled. Math does not blink."} Hint: {current.hint}.</p>
              <button className="rounded-full bg-white px-5 py-3 text-sm font-black text-black" onClick={next} type="button">
                Next Round
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function JudgeMode() {
  const cases = [
    { creatorDate: "Dec 1, 2024", difficulty: "Easy", thiefDate: "Dec 3, 2024", title: "Dance repost" },
    { creatorDate: "Nov 15, 2024", difficulty: "Medium", thiefDate: "Nov 20, 2024", title: "Re-encoded tutorial" },
    { creatorDate: "Oct 5, 2024 10:01", difficulty: "Hard", thiefDate: "Oct 5, 2024 10:09", title: "Same-day upload" }
  ];
  const [caseIndex, setCaseIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [ruled, setRuled] = useState<"creator" | "dismissed" | null>(null);
  const complete = caseIndex >= cases.length;
  const current = cases[Math.min(caseIndex, cases.length - 1)];
  const isCorrect = ruled === "creator" || caseIndex === 2;

  const rule = (choice: "creator" | "dismissed") => {
    if (ruled || complete) return;
    setRuled(choice);
    if (choice === "creator" || caseIndex === 2) setScore((value) => value + 1);
  };

  const next = () => {
    setRuled(null);
    setCaseIndex((value) => value + 1);
  };

  const title = score === 3 ? "Chief Justice of Web3" : score === 2 ? "Senior Judge" : score === 1 ? "Junior Judge" : "Still learning";

  return (
    <CursorGlow className="relative mt-8 overflow-hidden rounded-[2rem] border border-red-200/15 bg-black/65 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-red-200">Judge mode</p>
          <h3 className="mt-2 text-3xl font-black">You decide the evidence</h3>
        </div>
        <motion.span animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }} className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-black" transition={{ duration: 1.5, repeat: Infinity }}>
          <Stamp />
        </motion.span>
      </div>
      {complete ? (
        <motion.div animate={{ opacity: 1, scale: 1 }} className="mt-6 rounded-3xl border border-yellow-200/20 bg-yellow-200/[0.08] p-5" initial={{ opacity: 0, scale: 0.92 }}>
          <p className="text-4xl font-black">{score}/3</p>
          <p className="mt-2 text-xl font-black text-yellow-100">{title}</p>
          <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-black text-black" onClick={() => { setCaseIndex(0); setScore(0); setRuled(null); }} type="button">
            Review Again
          </button>
        </motion.div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
            <EvidenceCard date={current.creatorDate} label="Creator claim" status="Proof page present" />
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">{current.difficulty} case</p>
              <h4 className="mt-3 text-2xl font-black">{current.title}</h4>
              <div className="mt-5 h-2 rounded-full bg-gradient-to-r from-emerald-300 via-white to-red-300" />
              <div className="mt-3 flex justify-between text-xs text-zinc-500"><span>{current.creatorDate}</span><span>{current.thiefDate}</span></div>
              <p className="mt-5 font-mono text-xs leading-6 text-cyan-100">file check: 7f83b... vs a2f91...<br />visual match confirmed</p>
            </div>
            <EvidenceCard date={current.thiefDate} label="Thief defense" status="No certificate" />
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-black" onClick={() => rule("creator")} type="button">Rule for Creator</button>
              <button className="rounded-full border border-red-200/35 px-5 py-3 text-sm font-black text-red-100" onClick={() => rule("dismissed")} type="button">Case Dismissed</button>
            </div>
            {ruled ? (
              <div className="flex items-center gap-3">
                <p className={cn("font-black", isCorrect ? "text-yellow-100" : "text-red-200")}>{isCorrect ? "Correct ruling. Earliest proof wins." : "Evidence says otherwise."}</p>
                <button className="rounded-full bg-white px-4 py-2 text-xs font-black text-black" onClick={next} type="button">Next</button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </CursorGlow>
  );
}

const EvidenceCard = memo(function EvidenceCard({ date, label, status }: { date: string; label: string; status: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-black">
        <Fingerprint />
      </div>
      <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-black">{date}</p>
      <p className="mt-3 text-sm text-zinc-400">{status}</p>
    </div>
  );
});

function CTASection() {
  return (
    <section className="section cta-section playful-section playful-cta relative min-h-screen overflow-hidden px-4 py-24" id="cta">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(153,69,255,0.26),transparent_42%)]" />
      <div aria-hidden className="cta-rings">
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
        <span className="ring" />
      </div>
      <motion.div animate={{ scale: [0, 2.8], opacity: [0.7, 0] }} className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/50" transition={{ duration: 2.8, repeat: Infinity }} />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-12rem)] max-w-5xl place-items-center text-center">
        <ScrollReveal>
          <GuardianMini large />
          <h2 className="mt-8 text-5xl font-black leading-[0.95] md:text-7xl">Join the decentralized creator revolution.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">10,000+ creators. One blockchain. Zero middlemen.</p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <MagneticLink
              className="rounded-full bg-emerald-300 px-8 py-4 font-black text-black shadow-[0_0_70px_rgba(20,241,149,0.28)] transition"
              href={routes.dashboard}
            >
              Protect My Video
            </MagneticLink>
            <MagneticLink className="rounded-full border border-violet-300/45 px-8 py-4 font-black text-violet-100 transition hover:bg-white hover:text-black" href={routes.verify}>
              Read the Docs
            </MagneticLink>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function StorySection({ id, eyebrow, title, tone, children }: { id: SectionId; eyebrow: string; title: string; tone: "green" | "purple" | "cyan" | "red" | "gold"; children: ReactNode }) {
  const toneClass = {
    cyan: "text-cyan-200",
    gold: "text-yellow-200",
    green: "text-emerald-200",
    purple: "text-violet-300",
    red: "text-red-300"
  }[tone];

  return (
    <section className={cn("section playful-section relative min-h-screen overflow-hidden border-t border-white/10 bg-[#0A0A0F] px-4 py-24", `playful-${id}`, `${id === "how" ? "howitworks" : id}-section`)} id={id}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(153,69,255,0.16),transparent_30%),radial-gradient(circle_at_78%_70%,rgba(20,241,149,0.1),transparent_34%)]" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <ScrollReveal>
          <p className={cn("font-mono text-sm font-black uppercase tracking-[0.42em]", toneClass)}>{eyebrow}</p>
          <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">{title}</h2>
        </ScrollReveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

function CursorGlow({
  children,
  className,
  onPointerMove,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    if (ref.current) {
      ref.current.style.backgroundImage = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.16), rgba(153,69,255,0.09) 18%, transparent 44%)`;
    }
    onPointerMove?.(event);
  };

  return (
    <div
      ref={ref}
      className={cn("cursor-glow-card", className)}
      onPointerMove={handlePointerMove}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

const DepthParallax = memo(function DepthParallax() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="vidchain-blob vidchain-blob-one" />
      <div className="vidchain-blob vidchain-blob-two" />
      <div className="vidchain-blob vidchain-blob-three" />
    </div>
  );
});

function LightBulbCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const followerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"click" | "default" | "dragging" | "hover">("default");

  useEffect(() => {
    const cursor = cursorRef.current;
    const follower = followerRef.current;
    if (!cursor) return;
    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    const move = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      const target = event.target;
      if (target instanceof Element) {
        const interactive = target.closest("a,button,input,textarea,select,[role='button']");
        setState((current) => (current === "dragging" || current === "click" ? current : interactive ? "hover" : "default"));
      }
    };
    const down = () => {
      setState("click");
      window.setTimeout(() => setState("dragging"), 180);
    };
    const up = () => {
      setState("default");
    };
    const animate = () => {
      followerX += (mouseX - followerX) * 0.12;
      followerY += (mouseY - followerY) * 0.12;
      cursor.style.transform = `translate3d(${mouseX - 10}px, ${mouseY - 10}px, 0)`;
      if (follower) follower.style.transform = `translate3d(${followerX - 4}px, ${followerY - 4}px, 0)`;
    };
    MasterLoop.add("vidchain-cursor", animate, 0);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      MasterLoop.remove("vidchain-cursor");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <>
      <div ref={followerRef} className={cn("pointer-events-none fixed left-0 top-0 z-[9999] hidden h-2 w-2 rounded-full bg-emerald-300/70 shadow-[0_0_18px_rgba(20,241,149,0.65)] md:block", state !== "default" && "opacity-0")} />
      <div
        ref={cursorRef}
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[10000] hidden h-5 w-5 place-items-center rounded-full border text-black shadow-[0_0_12px_rgba(254,240,138,0.95),0_0_55px_rgba(20,241,149,0.4)] transition-[height,width,background-color,border-color,box-shadow] duration-200 md:grid",
          state === "default" && "border-violet-300 bg-yellow-100",
          state === "hover" && "h-10 w-10 border-violet-200 bg-violet-400/50 text-white shadow-[0_0_38px_rgba(153,69,255,0.72)]",
          state === "click" && "h-20 w-20 border-emerald-200 bg-emerald-200/20 text-emerald-50",
          state === "dragging" && "h-12 w-12 border-yellow-100 bg-yellow-100/25 text-yellow-50"
        )}
      >
        {state === "hover" ? <span className="text-lg font-black">+</span> : <Lightbulb size={state === "default" ? 11 : 17} />}
      </div>
    </>
  );
}

function MagneticLink({
  href,
  className,
  children
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    element.style.transform = `translate3d(${x * 0.3}px, ${y * 0.3}px, 0)`;
  };
  const reset = () => {
    const element = ref.current;
    if (element) element.style.transform = "translate3d(0,0,0)";
  };
  return (
    <Link className={className} href={href} onPointerLeave={reset} onPointerMove={handlePointerMove} ref={ref}>
      {children}
    </Link>
  );
}

function ScrollReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28, scale: 0.98 }} transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }} viewport={{ amount: 0.24, once: true }} whileInView={{ opacity: 1, y: 0, scale: 1 }}>
      {children}
    </motion.div>
  );
}

function ProgressRail({ activeSection }: { activeSection: SectionId }) {
  return (
    <nav className="fixed right-5 top-1/2 z-[60] hidden -translate-y-1/2 flex-col gap-3 md:flex" aria-label="Landing sections">
      {sections.map((section) => (
        <a className="group relative grid h-4 w-4 place-items-center" href={`#${section.id}`} key={section.id}>
          <span className={cn("h-2 w-2 rounded-full border border-white/25 bg-white/20 transition", activeSection === section.id && "h-4 w-4 animate-pulse bg-emerald-300 shadow-[0_0_28px_rgba(20,241,149,0.7)]")} />
          <span className="pointer-events-none absolute right-7 rounded-full border border-white/10 bg-black/80 px-3 py-1 text-xs font-black opacity-0 backdrop-blur transition group-hover:opacity-100">{section.label}</span>
        </a>
      ))}
    </nav>
  );
}

function CinematicTransition({ kind }: { kind: "crack" | "vortex" | "stamp" | "matrix" | "coin" | "chain" | "supernova" }) {
  return (
    <div className="relative h-48 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(153,69,255,0.18),transparent_55%)]" />
      <PerchedRobot kind={kind} />
      {kind === "crack" ? <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 220"><path className="crack-line" d="M500 0 L486 48 L525 82 L470 112 L536 145 L500 220" /></svg> : null}
      {kind === "vortex" ? <motion.div animate={{ rotate: 360, scale: [0.6, 1.5, 0.6] }} className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald-200/30" transition={{ duration: 7, repeat: Infinity, ease: "linear" }} /> : null}
      {kind === "stamp" ? <motion.div animate={{ y: [0, 18, 0], rotate: [-4, 4, -4] }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-violet-400/70 px-8 py-4 text-2xl font-black uppercase text-violet-200" transition={{ duration: 2.8, repeat: Infinity }}>Verified on Solana</motion.div> : null}
      {kind === "matrix" ? <div className="absolute inset-0 matrix-text">0101 af90 b7c3 91bc copy check 77aa</div> : null}
      {kind === "coin" ? <div className="absolute inset-0 flex items-center justify-center gap-3 text-yellow-200">{Array.from({ length: 18 }, (_, index) => <motion.span animate={{ y: [0, -30, 0], rotate: [0, 360] }} key={index} transition={{ delay: index * 0.06, duration: 2, repeat: Infinity }}>SOL</motion.span>)}</div> : null}
      {kind === "chain" ? <div className="absolute inset-0 flex items-center justify-center gap-2">{Array.from({ length: 11 }, (_, index) => <motion.span animate={{ y: [index % 2 ? -8 : 8, 0, index % 2 ? -8 : 8] }} className="h-10 w-16 rounded-full border-4 border-cyan-100/25" key={index} transition={{ delay: index * 0.08, duration: 2.4, repeat: Infinity }} />)}</div> : null}
      {kind === "supernova" ? <motion.div animate={{ scale: [0, 7], opacity: [1, 0] }} className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" transition={{ duration: 2.4, repeat: Infinity }} /> : null}
    </div>
  );
}

const PerchedRobot = memo(function PerchedRobot({ kind }: { kind: "chain" | "coin" | "crack" | "matrix" | "stamp" | "supernova" | "vortex" }) {
  const left = {
    chain: "left-[69%]",
    coin: "left-[58%]",
    crack: "left-[18%]",
    matrix: "left-[48%]",
    stamp: "left-[38%]",
    supernova: "left-[50%]",
    vortex: "left-[78%]"
  }[kind];

  return (
    <motion.div
      animate={{ rotate: [-4, 5, -4], y: [0, -10, 0] }}
      className={cn("pointer-events-none absolute top-5 z-20 hidden h-24 w-24 -translate-x-1/2 md:block", left)}
      transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity }}
    >
      <motion.div
        animate={{ scaleY: [1, 0.92, 1] }}
        className="absolute left-1/2 top-4 h-16 w-16 -translate-x-1/2 rounded-2xl border border-cyan-100/25 bg-black/80 shadow-[0_0_50px_rgba(20,241,149,0.22)] backdrop-blur"
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <span className="absolute left-4 top-5 h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_14px_rgba(165,243,252,0.9)]" />
        <span className="absolute right-4 top-5 h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_14px_rgba(165,243,252,0.9)]" />
        <span className="absolute bottom-4 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full bg-emerald-200 shadow-[0_0_16px_rgba(20,241,149,0.8)]" />
      </motion.div>
      <motion.div animate={{ scaleX: [0.7, 1, 0.7], opacity: [0.28, 0.6, 0.28] }} className="absolute bottom-1 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full bg-emerald-200/50 blur-sm" transition={{ duration: 2.4, repeat: Infinity }} />
    </motion.div>
  );
});

const StarField = memo(function StarField() {
  return <div className="pointer-events-none absolute inset-0 opacity-55 dot-grid" />;
});

const GuardianMini = memo(function GuardianMini({ large = false }: { large?: boolean }) {
  return (
    <motion.div animate={{ y: [0, -12, 0], rotateY: [-7, 7, -7] }} className={cn("relative grid place-items-center", large ? "mx-auto h-44 w-44" : "h-28 w-28")} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
      <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-3xl" />
      <div className={cn("relative grid place-items-center rounded-3xl border border-white/15 bg-black/75 shadow-[0_0_90px_rgba(153,69,255,0.26)]", large ? "h-28 w-28" : "h-20 w-20")}>
        <Bot className="text-emerald-200" size={large ? 48 : 32} />
      </div>
      <motion.div animate={{ rotate: 360 }} className="absolute h-full w-full rounded-full border border-dashed border-emerald-200/20" transition={{ duration: 24, repeat: Infinity, ease: "linear" }} />
    </motion.div>
  );
});

function ShatterParticles() {
  return (
    <>
      <p className="absolute right-5 top-5 rounded-full bg-red-300 px-3 py-1 text-xs font-black text-black">Shattered</p>
      {Array.from({ length: 24 }, (_, index) => (
        <motion.span animate={{ opacity: [1, 0], x: (index % 6 - 3) * 34, y: Math.floor(index / 6) * 30 - 48, rotate: index * 18 }} className="absolute left-1/2 top-1/2 h-2 w-2 bg-red-200" key={index} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.4 }} />
      ))}
    </>
  );
}

function Typewriter({ text }: { text: string }) {
  return (
    <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
      {text.split("").map((char, index) => (
        <motion.span initial={{ opacity: 0 }} key={`${char}-${index}`} transition={{ delay: index * 0.018 }} whileInView={{ opacity: 1 }}>
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

function PixelHash({ active }: { active: boolean }) {
  return (
    <div className="mt-6 grid grid-cols-8 gap-1">
      {Array.from({ length: 64 }, (_, index) => (
        <motion.span animate={active ? { opacity: 1, scale: 1 } : { opacity: 0.25, scale: 0.72 }} className={cn("h-2 rounded-sm", index % 3 === 0 ? "bg-emerald-300" : "bg-violet-300")} key={index} transition={{ delay: index * 0.008 }} />
      ))}
    </div>
  );
}

const MatrixRain = memo(function MatrixRain() {
  return <div className="pointer-events-none absolute inset-0 opacity-20 matrix-text">010101 af09 bc72 91bc 77aa feed cafe 4f8a copy check file check</div>;
});

const Meter = memo(function Meter({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between text-sm font-black">
        <span>{label}</span>
        <span className="text-emerald-200">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div animate={{ width }} className="h-full bg-emerald-300 shadow-[0_0_24px_rgba(20,241,149,0.8)]" />
      </div>
    </div>
  );
});

function ReputationBar({ label, value, tone }: { label: string; value: number; tone: "red" | "green" }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-black">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div animate={{ width: `${value}%` }} className={cn("h-full", tone === "red" ? "bg-red-400" : "bg-emerald-300")} />
      </div>
    </div>
  );
}

