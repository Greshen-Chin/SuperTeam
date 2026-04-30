"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Wallet } from "lucide-react";
import bs58 from "bs58";
import {
  hasBackendAuth,
  loginWithGoogleToken,
  loginWithPassword,
  loginWithWallet,
  persistAuth,
  registerWithPassword,
  requestWalletNonce
} from "@/lib/auth-client";
import { routes } from "@/lib/routes";

type AuthMode = "login" | "register";
type BusyState = "password" | "google" | "wallet" | null;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);

  const nextPath = useMemo(() => {
    const next = searchParams?.get("next");
    return next?.startsWith("/") ? next : routes.dashboard;
  }, [searchParams]);

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      try {
        setBusy("google");
        setError(null);
        const result = await loginWithGoogleToken(tokenResponse.access_token);
        persistAuth(result);
        goNext();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Login Google gagal. Coba lagi.");
      } finally {
        setBusy(null);
      }
    },
    onError: () => {
      setBusy(null);
      setError("Login Google dibatalkan atau gagal. Coba lagi.");
    }
  });

  function goNext() {
    window.setTimeout(() => {
      router.push(nextPath);
      router.refresh();
    }, 500);
  }

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setBusy("password");
      setError(null);
      const result =
        mode === "register"
          ? await registerWithPassword({ email, password })
          : await loginWithPassword({ email, password });
      persistAuth(result);
      goNext();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login gagal. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  async function handleWalletLogin() {
    try {
      setBusy("wallet");
      setError(null);

      const phantom = window.phantom?.solana ?? window.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet belum tersedia. Install Phantom, lalu coba lagi.");
      }

      const connected = await phantom.connect();
      const address = connected.publicKey.toString();
      const { nonce } = await requestWalletNonce(address);
      const message = new TextEncoder().encode(`Login nonce: ${nonce}`);
      const signed = await phantom.signMessage(message, "utf8");
      const signature = bs58.encode(signed.signature);
      const result = await loginWithWallet({ address, signature, nonce });
      persistAuth(result);
      goNext();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login wallet gagal. Coba lagi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[var(--app-bg)] px-4 py-10 text-[var(--app-fg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_15%_80%,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.035)_45%,transparent_62%)]" />

      <section className="relative mx-auto w-full max-w-[520px]">
        <div className="relative mx-auto w-full max-w-[460px]">
          <PeekingBackdrop peeking={showPassword} />

          <AnimatePresence mode="wait">
            <motion.h1
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="text-center text-3xl font-black tracking-tight"
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              key={mode}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {mode === "register" ? "Create your VidChain account" : "Sign in to VidChain"}
            </motion.h1>
          </AnimatePresence>

          <p className="mt-3 text-center text-sm text-[var(--app-muted)]">
            {mode === "register" ? "Create your account, then register your first proof." : "Welcome back. Your proof workspace is waiting."}
          </p>

          <motion.form
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            className="relative mt-24 space-y-5 rounded-[2rem] border border-white/10 bg-[rgba(24,24,30,0.68)] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
            initial={{ opacity: 0, rotateY: mode === "register" ? -8 : 8, y: 22 }}
            key={mode}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handlePasswordAuth}
          >
          <AuthMascot mode={mode} peeking={showPassword} />
          <label className="block">
            <span className="text-base font-semibold">Username or email address</span>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" size={18} />
              <input
                className="h-[50px] w-full rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg-soft)] px-10 text-[15px] text-[var(--app-fg)] outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold">Password</span>
              {mode === "login" ? (
                <button className="text-base text-violet-400 transition hover:text-violet-300" type="button">
                  Forgot password?
                </button>
              ) : null}
            </span>
            <div className="relative mt-2">
              <PasswordPeekers peeking={showPassword} />
              <Lock className="pointer-events-none absolute left-3 top-1/2 z-30 -translate-y-1/2 text-[var(--app-muted)]" size={18} />
              <input
                className="relative z-20 h-[50px] w-full rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg-soft)] px-10 pr-12 text-[15px] text-[var(--app-fg)] outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30"
                minLength={8}
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 z-30 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[var(--app-muted)] transition hover:bg-white/10 hover:text-[var(--app-fg)]"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </label>

          <button
            className="group relative h-[50px] w-full overflow-hidden rounded-2xl bg-white text-base font-black text-black transition hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(124,58,237,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasBackendAuth() || busy === "password"}
            type="submit"
          >
            <span className="absolute inset-y-0 left-0 w-0 bg-violet-500 transition-all duration-500 group-hover:w-full" />
            <span className="relative transition group-hover:text-white">
              {busy === "password" ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
            </span>
          </button>
          </motion.form>

          <div className="my-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--app-line)]" />
          <span className="text-base text-[var(--app-fg)]">or</span>
          <span className="h-px flex-1 bg-[var(--app-line)]" />
          </div>

          <div className="space-y-3">
          <button
            className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] text-base font-semibold text-[var(--app-fg)] transition hover:-translate-y-0.5 hover:bg-[var(--app-panel-strong)] hover:shadow-xl hover:shadow-black/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasBackendAuth() || busy === "wallet"}
            type="button"
            onClick={handleWalletLogin}
          >
            <Wallet size={21} />
            {busy === "wallet" ? "Connecting Phantom..." : "Continue with Phantom"}
          </button>

          <button
            className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] text-base font-semibold text-[var(--app-fg)] transition hover:-translate-y-0.5 hover:bg-[var(--app-panel-strong)] hover:shadow-xl hover:shadow-black/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasBackendAuth() || busy === "google"}
            type="button"
            onClick={() => {
              setBusy("google");
              setError(null);
              googleLogin();
            }}
          >
            <span className="text-xl font-bold text-[#4285f4]">G</span>
            {busy === "google" ? "Opening Google..." : "Continue with Google"}
          </button>
          </div>

          <p className="mt-7 text-center text-lg">
          {mode === "login" ? "New to VidChain? " : "Already have an account? "}
          <button
            className="font-semibold text-violet-400 transition hover:text-violet-300"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
          </p>

          {error ? <p className="mt-5 rounded-md border border-[#f85149]/30 bg-[#f85149]/10 px-3 py-2 text-sm text-[#ffb4ad]">{error}</p> : null}
          {!hasBackendAuth() ? <p className="mt-3 rounded-md border border-[#d29922]/30 bg-[#d29922]/10 px-3 py-2 text-sm text-[#f0d087]">Set NEXT_PUBLIC_API_BASE_URL first.</p> : null}
        </div>
      </section>
    </div>
  );
}

function AuthMascot({ mode, peeking }: { mode: AuthMode; peeking: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-24 w-28 -translate-x-1/2 -translate-y-full">
      <motion.div
        animate={peeking ? { y: 8, rotate: 0, scale: 1.04 } : { y: 18, rotate: -2, scale: 1 }}
        className="absolute left-1/2 top-0 h-20 w-24 -translate-x-1/2 rounded-[1.7rem] bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
        transition={{ type: "spring", stiffness: 190, damping: 18 }}
      >
        <div className="absolute inset-x-4 top-5 flex justify-between">
          <MascotEye open={peeking} />
          <MascotEye open={peeking} />
        </div>
        <motion.div
          animate={peeking ? { y: 2, scaleX: 1.1 } : { y: -1, scaleX: 0.78 }}
          className="absolute bottom-4 left-1/2 h-2 w-7 -translate-x-1/2 rounded-full bg-black"
          transition={{ duration: 0.22 }}
        />
        <motion.div
          animate={mode === "register" ? { rotate: 6, scale: 1.04 } : { rotate: -4, scale: 1 }}
          className="absolute -right-3 top-2 rounded-full bg-violet-500 px-2 py-1 text-[10px] font-black uppercase text-white"
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === "register" ? "new" : "login"}
        </motion.div>
      </motion.div>
    </div>
  );
}

function PasswordPeekers({ peeking }: { peeking: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 hidden sm:block">
      <motion.div
        animate={peeking ? { width: 116, x: -106, opacity: 1 } : { width: 0, x: -12, opacity: 0 }}
        className="absolute left-0 top-1/2 h-7 -translate-y-1/2 rounded-full bg-white shadow-[0_16px_50px_rgba(255,255,255,0.12)]"
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
      />
      <motion.div
        animate={peeking ? { x: -164, rotate: -8, opacity: 1, scale: 1 } : { x: -56, rotate: -4, opacity: 0, scale: 0.72 }}
        className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 rounded-[1.35rem] bg-white text-black shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
      >
        <SideFace open={peeking} />
      </motion.div>

      <motion.div
        animate={peeking ? { width: 116, x: 106, opacity: 1 } : { width: 0, x: 12, opacity: 0 }}
        className="absolute right-0 top-1/2 h-7 -translate-y-1/2 rounded-full bg-white shadow-[0_16px_50px_rgba(255,255,255,0.12)]"
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
      />
      <motion.div
        animate={peeking ? { x: 164, rotate: 8, opacity: 1, scale: 1 } : { x: 56, rotate: 4, opacity: 0, scale: 0.72 }}
        className="absolute right-0 top-1/2 h-16 w-16 -translate-y-1/2 rounded-[1.35rem] bg-white text-black shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
      >
        <SideFace open={peeking} />
      </motion.div>
    </div>
  );
}

function PeekingBackdrop({ peeking }: { peeking: boolean }) {
  const crew = [
    "-left-20 top-32 -rotate-12",
    "-right-20 top-44 rotate-12",
    "left-2 top-[28rem] rotate-6",
    "right-4 top-[31rem] -rotate-6",
    "left-1/2 top-[25rem] -translate-x-1/2 rotate-3"
  ];
  return (
    <div className="pointer-events-none absolute -inset-x-20 inset-y-0 hidden sm:block">
      <motion.div
        animate={peeking ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        className="absolute left-1/2 top-44 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl"
        transition={{ duration: 0.3 }}
      />
      {crew.map((position, index) => (
        <motion.div
          animate={peeking ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.24, scale: 0.86, y: index % 2 === 0 ? 8 : -8 }}
          className={`absolute ${position} grid h-12 w-12 place-items-center rounded-2xl bg-white text-black shadow-[0_18px_60px_rgba(0,0,0,0.28)]`}
          key={position}
          transition={{ delay: index * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-black" />
            <span className="h-2.5 w-2.5 rounded-full bg-black" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SideFace({ open }: { open: boolean }) {
  return (
    <>
      <div className="absolute inset-x-3 top-3 flex justify-between">
        <MascotEye open={open} />
        <MascotEye open={open} />
      </div>
      <motion.div
        animate={open ? { y: 3, scaleX: 1.12 } : { y: 0, scaleX: 0.9 }}
        className="absolute bottom-4 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full bg-black"
        transition={{ duration: 0.22 }}
      />
    </>
  );
}

function MascotEye({ open }: { open: boolean }) {
  return (
    <div className="relative h-8 w-7 overflow-hidden rounded-full bg-black">
      <motion.div
        animate={open ? { y: "-120%" } : { y: 0 }}
        className="absolute inset-x-0 top-0 z-10 h-full rounded-full bg-white"
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        animate={open ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        transition={{ duration: 0.22 }}
      />
    </div>
  );
}
