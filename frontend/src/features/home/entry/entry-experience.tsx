"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextScramble } from "@/components/ui/text-scramble";
import { BackgroundLoader } from "../systems/background-loader";
import { playSoftTone } from "../systems/cursor-system";
import { createVisualProfile } from "../systems/profile";

type EntryExperienceProps = {
  onReveal: () => void;
};

type EntryPhase = "blackout" | "flashlight" | "revealed" | "welcome";

export function EntryExperience({ onReveal }: EntryExperienceProps) {
  const [phase, setPhase] = useState<EntryPhase>("welcome");
  const [eyesVisible, setEyesVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [flashlight, setFlashlight] = useState({ radius: 150, x: 0, y: 0 });
  const [dustSeed, setDustSeed] = useState(0);
  const profile = useMemo(() => createVisualProfile(), []);
  const coveredRef = useRef(new Set<string>());
  const revealStartedRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);

  const triggerFullReveal = useCallback(() => {
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;
    playSoftTone("reveal");
    setFlashlight((current) => ({ ...current, radius: 2000 }));
    window.setTimeout(() => {
      setPhase("revealed");
      onReveal();
    }, 720);
  }, [onReveal]);

  const trackCoverage = useCallback(
    (x: number, y: number) => {
      const cellX = Math.floor(x / Math.max(1, window.innerWidth / 10));
      const cellY = Math.floor(y / Math.max(1, window.innerHeight / 10));
      coveredRef.current.add(`${cellX},${cellY}`);
      if (coveredRef.current.size / 100 >= 0.6) triggerFullReveal();
    },
    [triggerFullReveal]
  );

  const enterBlackout = useCallback(() => {
    if (phase !== "welcome") return;
    if (fallbackRef.current) window.clearTimeout(fallbackRef.current);
    setPhase("blackout");
    void BackgroundLoader.startLoading();
    window.setTimeout(() => {
      setEyesVisible(true);
      playSoftTone("hum");
    }, 600);
    window.setTimeout(() => setPromptVisible(true), 1600);
  }, [phase]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    fallbackRef.current = window.setTimeout(enterBlackout, 3200);
    return () => {
      if (fallbackRef.current) window.clearTimeout(fallbackRef.current);
    };
  }, [enterBlackout]);

  useEffect(() => {
    const move = (x: number, y: number) => {
      setMouse({ x, y });
      if (phase === "flashlight") {
        setFlashlight((current) => ({ ...current, x, y }));
        trackCoverage(x, y);
      }
    };
    const mouseMove = (event: MouseEvent) => move(event.clientX, event.clientY);
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) move(touch.clientX, touch.clientY);
    };
    window.addEventListener("mousemove", mouseMove, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("touchmove", touchMove);
    };
  }, [phase, trackCoverage]);

  useEffect(() => {
    if (phase !== "flashlight") return;
    const timer = window.setTimeout(triggerFullReveal, 8000);
    return () => window.clearTimeout(timer);
  }, [phase, triggerFullReveal]);

  if (phase === "revealed") return null;

  const centerX = typeof window === "undefined" ? 0 : window.innerWidth / 2;
  const centerY = typeof window === "undefined" ? 0 : window.innerHeight / 2;
  const dx = centerX > 0 ? (mouse.x - centerX) / centerX : 0;
  const dy = centerY > 0 ? (mouse.y - centerY) / centerY : 0;
  const pupilX = Math.max(-12, Math.min(12, dx * 12));
  const pupilY = Math.max(-6, Math.min(6, dy * 6));

  return (
    <AnimatePresence>
      {phase === "welcome" ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-black"
          exit={{ opacity: 0 }}
          id="welcome-screen"
          initial={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeIn" }}
        >
          <div className="pointer-events-none absolute inset-8 border border-white/10 md:inset-14" />
          <motion.div animate={{ y: ["-42vh", "42vh", "-42vh"], opacity: [0, 0.55, 0] }} className="pointer-events-none absolute h-px w-full bg-white/25" transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }} />
          <div className="relative z-20 px-4 text-center">
            <TextScramble as="h1" characterSet="VIDCHAIN01<>/{}[]#$" className="font-mono text-4xl font-black uppercase tracking-wide text-white md:text-7xl" duration={1.35} onScrambleComplete={enterBlackout} speed={0.025}>
              Welcome To VidChain
            </TextScramble>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.45em] text-white/45">Origin proof online</p>
          </div>
        </motion.div>
      ) : null}

      {phase === "blackout" || phase === "flashlight" ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[115] overflow-hidden bg-black"
          id="blackout-screen"
          initial={{ opacity: 0 }}
          onClick={() => {
            if (phase !== "blackout" || !eyesVisible) return;
            playSoftTone("activate");
            setEyesVisible(false);
            setPromptVisible(false);
            setDustSeed((value) => value + 1);
            setFlashlight({ radius: 18, x: mouse.x || centerX, y: mouse.y || centerY });
            setPhase("flashlight");
            window.setTimeout(() => setFlashlight((current) => ({ ...current, radius: Math.round(profile.flashlightRadius * 0.48) })), 90);
            window.setTimeout(() => setFlashlight((current) => ({ ...current, radius: profile.flashlightRadius })), 620);
          }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="absolute inset-0"
            id="blackout-overlay"
            style={
              phase === "flashlight"
                ? {
                    background: `radial-gradient(circle ${flashlight.radius}px at ${flashlight.x}px ${flashlight.y}px, transparent 0%, transparent 40%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.85) 80%, rgba(0,0,0,0.97) 100%)`,
                    transition: flashlight.radius > 1000 ? "background 600ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease 200ms" : "background 680ms cubic-bezier(0.22,1,0.36,1)"
                  }
                : undefined
            }
          />

          {phase === "flashlight" && profile.flashlightDust ? <FlashlightDust key={dustSeed} x={flashlight.x} y={flashlight.y} /> : null}

          <AnimatePresence>
            {eyesVisible ? <RobotEyes pupilX={pupilX} pupilY={pupilY} /> : null}
          </AnimatePresence>

          <AnimatePresence>
            {promptVisible && eyesVisible ? (
              <motion.div animate={{ opacity: [0.25, 0.4, 0.25] }} className="absolute left-1/2 top-[calc(50%+72px)] -translate-x-1/2 text-center font-mono text-[13px] uppercase tracking-[0.25em] text-white/35" exit={{ opacity: 0 }} initial={{ opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity }}>
                click anywhere to see
                <motion.div animate={{ opacity: [0.2, 0.55, 0.2], y: [0, 7, 0] }} className="mx-auto mt-5 h-3 w-3 rotate-45 border-b border-r border-white/30" transition={{ duration: 2, repeat: Infinity }} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function RobotEyes({ pupilX, pupilY }: { pupilX: number; pupilY: number }) {
  return (
    <motion.div animate={{ opacity: 1, scale: [0, 1.08, 1] }} className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2" exit={{ opacity: 0, scale: 1.1 }} initial={{ opacity: 0, scale: 0 }} transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}>
      <svg className="robot-eyes h-full w-full" viewBox="0 0 240 240">
        <defs>
          <filter id="robot-eye-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="robot-face-glow" cx="50%" cy="38%" r="64%">
            <stop offset="0%" stopColor="rgba(103,232,249,0.18)" />
            <stop offset="48%" stopColor="rgba(124,58,237,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <ellipse className="breath-glow" cx="120" cy="120" fill="rgba(124,58,237,0.15)" rx="74" ry="64" />
        <rect fill="#050508" height="160" opacity="0.96" rx="32" stroke="#10101d" strokeWidth="1" width="160" x="40" y="40" />
        <rect fill="#080814" height="66" rx="18" stroke="#1a1a2e" strokeWidth="1" width="116" x="62" y="64" />
        {[
          { className: "eye-left", x: 92 },
          { className: "eye-right", x: 148 }
        ].map((eye) => (
          <g className={eye.className} key={eye.className} transform={`translate(${eye.x},96)`}>
            <ellipse cx="0" cy="0" fill="#0d0d1a" rx="18" ry="14" />
            <g className="pupil" style={{ transform: `translate(${pupilX}px, ${pupilY}px)`, transition: "transform 300ms ease-out" }}>
              <circle className="iris-rotate" cx="0" cy="0" fill="#a5f3fc" filter="url(#robot-eye-glow)" r="7" />
              <circle cx="0" cy="0" fill="#e0fbff" r="3.6" />
              <circle cx="2" cy="-2" fill="white" opacity="0.8" r="1.5" />
            </g>
            <rect className="eyelid" fill="#080814" height="34" width="46" x="-23" y="-17" />
          </g>
        ))}
        <rect fill="#67e8f9" filter="url(#robot-eye-glow)" height="8" opacity="0.9" rx="4" width="76" x="82" y="154" />
        <rect fill="#5ee7b7" height="54" opacity="0.9" rx="14" width="54" x="93" y="118" />
        <path d="M120 132 L131 137 V149 C131 158 125 164 120 166 C115 164 109 158 109 149 V137 Z" fill="none" stroke="#051016" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <rect fill="url(#robot-face-glow)" height="200" width="200" x="20" y="20" />
      </svg>
    </motion.div>
  );
}

function FlashlightDust({ x, y }: { x: number; y: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          className="flashlight-dust-dot"
          key={index}
          style={{
            left: x + Math.cos(index * 0.9) * (34 + index * 9),
            top: y + Math.sin(index * 1.2) * (28 + index * 7)
          }}
        />
      ))}
    </div>
  );
}
