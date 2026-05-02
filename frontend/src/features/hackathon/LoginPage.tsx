"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { routes } from "@/lib/routes";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle, loginWithEmail, isLoggedIn, isLoading, error } = useAuth();

  const nextPath = useMemo(() => {
    const next = searchParams?.get("next");
    return next?.startsWith("/") ? next : routes.dashboard;
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn) {
      window.setTimeout(() => {
        router.push(nextPath);
        router.refresh();
      }, 500);
    }
  }, [isLoggedIn, nextPath, router]);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[var(--app-bg)] px-4 py-10 text-[var(--app-fg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.035)_45%,transparent_62%)]" />

      <section className="relative mx-auto w-full max-w-[520px]">
        <div className="relative mx-auto w-full max-w-[460px]">

          <AnimatePresence mode="wait">
            <motion.h1
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="text-center text-3xl font-black tracking-tight"
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              key="title"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              Sign in to VidChain
            </motion.h1>
          </AnimatePresence>

          <p className="mt-3 text-center text-sm text-[var(--app-muted)]">
            Your proof workspace is waiting.
          </p>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-16 space-y-3 rounded-[2rem] border border-white/10 bg-[rgba(24,24,30,0.68)] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl"
            initial={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <AuthMascot />

            <button
              className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--app-line)] bg-white text-base font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-xl hover:shadow-black/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="button"
              onClick={() => void loginWithGoogle()}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading ? "Opening..." : "Continue with Google"}
            </button>

            <button
              className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] text-base font-semibold text-[var(--app-fg)] transition hover:-translate-y-0.5 hover:bg-[var(--app-panel-strong)] hover:shadow-xl hover:shadow-black/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="button"
              onClick={() => void loginWithEmail()}
            >
              ✉️ {isLoading ? "Opening..." : "Continue with Email"}
            </button>

            <button
              className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] text-base font-semibold text-[var(--app-fg)] transition hover:-translate-y-0.5 hover:bg-[var(--app-panel-strong)] hover:shadow-xl hover:shadow-black/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="button"
              onClick={() => void loginWithGoogle()}
            >
              👻 {isLoading ? "Connecting..." : "Continue with Phantom"}
            </button>
          </motion.div>

          {error ? (
            <p className="mt-5 rounded-md border border-[#f85149]/30 bg-[#f85149]/10 px-3 py-2 text-sm text-[#ffb4ad]">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function AuthMascot() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-24 w-28 -translate-x-1/2 -translate-y-full">
      <motion.div
        animate={{ y: 18, rotate: -2, scale: 1 }}
        className="absolute left-1/2 top-0 h-20 w-24 -translate-x-1/2 rounded-[1.7rem] bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
        transition={{ type: "spring", stiffness: 190, damping: 18 }}
      >
        <div className="absolute inset-x-4 top-5 flex justify-between">
          <MascotEye />
          <MascotEye />
        </div>
        <motion.div
          animate={{ y: -1, scaleX: 0.78 }}
          className="absolute bottom-4 left-1/2 h-2 w-7 -translate-x-1/2 rounded-full bg-black"
          transition={{ duration: 0.22 }}
        />
        <div className="absolute -right-3 top-2 rounded-full bg-violet-500 px-2 py-1 text-[10px] font-black uppercase text-white">
          login
        </div>
      </motion.div>
    </div>
  );
}

function MascotEye() {
  return (
    <div className="relative h-8 w-7 overflow-hidden rounded-full bg-black">
      <motion.div
        animate={{ y: 0 }}
        className="absolute inset-x-0 top-0 z-10 h-full rounded-full bg-white"
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        animate={{ scale: 0.7, opacity: 0 }}
        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        transition={{ duration: 0.22 }}
      />
    </div>
  );
}
