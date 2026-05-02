"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { BadgeCheck, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type WaitlistStatus = "idle" | "loading" | "success";
type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

export function WaitlistHero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<WaitlistStatus>("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fireConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const particles: ConfettiParticle[] = [];
    const colors = ["#67e8f9", "#a78bfa", "#10b981", "#fbbf24", "#ffffff"];

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    for (let index = 0; index < 54; index += 1) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 2) * 10,
        life: 100,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#ffffff",
        size: Math.random() * 4 + 2
      });
    }

    const animate = () => {
      if (particles.length === 0) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!particle) continue;

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.5;
        particle.life -= 2;

        context.fillStyle = particle.color;
        context.globalAlpha = Math.max(0, particle.life / 100);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();

        if (particle.life <= 0) {
          particles.splice(index, 1);
          index -= 1;
        }
      }

      window.requestAnimationFrame(animate);
    };

    animate();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");

    window.setTimeout(() => {
      setStatus("success");
      setEmail("");
      fireConfetti();
    }, 900);
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <OrbitImage
          className="waitlist-spin-slow h-[72rem] w-[72rem] opacity-40 sm:h-[92rem] sm:w-[92rem]"
          rotate="279deg"
          src="https://framerusercontent.com/images/oqZEqzDEgSLygmUDuZAYNh2XQ9U.png?scale-down-to=2048"
        />
        <OrbitImage
          className="waitlist-spin-reverse h-[44rem] w-[44rem] opacity-55 sm:h-[64rem] sm:w-[64rem]"
          rotate="304deg"
          src="https://framerusercontent.com/images/UbucGYsHDAUHfaGZNjwyCzViw8.png?scale-down-to=1024"
        />
        <OrbitImage
          className="waitlist-spin-slow h-[32rem] w-[32rem] opacity-75 sm:h-[48rem] sm:w-[48rem]"
          rotate="48deg"
          src="https://framerusercontent.com/images/Ans5PAxtJfg3CwxlrPMSshx2Pqc.png"
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,47,73,0)_0%,rgba(0,0,0,0.18)_44%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/72 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-end px-4 pb-20 text-center md:pb-24">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-white/12 bg-white/10 shadow-[0_20px_70px_rgba(103,232,249,0.2)] backdrop-blur">
          <Sparkles size={26} />
        </div>
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">Join VidChain early.</h1>
        <p className="mt-4 max-w-2xl text-lg font-medium leading-8 text-zinc-300">
          Get creator proof tools, video fingerprinting, and share-ready certificates before the public launch.
        </p>

        <div className="relative mt-8 h-[60px] w-full max-w-md px-2">
          <canvas
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
            ref={canvasRef}
          />

          <div
            className={cn(
              "absolute inset-x-2 inset-y-0 flex items-center justify-center rounded-full bg-emerald-500 font-bold text-white transition duration-500",
              status === "success" ? "scale-100 opacity-100 waitlist-success-glow" : "pointer-events-none scale-95 opacity-0"
            )}
            role="status"
          >
            <BadgeCheck size={21} />
            <span className="ml-2">You are on the list</span>
          </div>

          <form
            className={cn(
              "relative h-full transition duration-500",
              status === "success" ? "pointer-events-none scale-95 opacity-0" : "scale-100 opacity-100"
            )}
            onSubmit={handleSubmit}
          >
            <Mail className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              className="h-full w-full rounded-full bg-zinc-900 pl-14 pr-36 text-white outline-none ring-1 ring-white/10 transition placeholder:text-zinc-500 focus:ring-cyan-200/50 disabled:opacity-70"
              disabled={status === "loading"}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@email.com"
              required
              type="email"
              value={email}
            />
            <button
              className="absolute bottom-1.5 right-1.5 top-1.5 min-w-32 rounded-full bg-cyan-500 px-5 text-sm font-black text-black transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-80"
              disabled={status === "loading"}
              type="submit"
            >
              {status === "loading" ? "Joining..." : "Join"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function OrbitImage({ className, rotate, src }: { className: string; rotate: string; src: string }) {
  return (
    <div
      className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", className)}
      style={{ transform: `translate(-50%, -50%) rotate(${rotate})` }}
    >
      <img alt="" className="h-full w-full object-cover" draggable={false} src={src} />
    </div>
  );
}
