"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wallet, X } from "lucide-react";
import { routes } from "@/lib/routes";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const router = useRouter();
  const { loginWithGoogle, isLoggedIn, isLoading, error } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (isLoggedIn && open) {
      onClose();
      router.push(routes.dashboard);
    }
  }, [isLoggedIn, open, onClose, router]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-[460px]"
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              className="absolute right-4 top-4 z-20 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/15 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={14} />
            </button>

            <div className="relative mt-16 space-y-3 rounded-[2rem] border border-white/10 bg-[rgba(10,10,16,0.94)] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <ModalMascot />

              <h2 className="text-center text-2xl font-black tracking-tight text-white">
                Continue to VidChain
              </h2>
              <p className="pb-2 text-center text-sm text-white/45">
                Your proof workspace is waiting.
              </p>

              <button
                className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white text-sm font-semibold text-zinc-900 transition hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-xl hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => void loginWithGoogle()}
                type="button"
              >
                <GoogleIcon />
                {isLoading ? "Opening..." : "Continue with Google"}
              </button>

              <button
                className="flex h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => void loginWithGoogle()}
                type="button"
              >
                <Wallet size={18} />
                {isLoading ? "Connecting..." : "Continue with Wallet"}
              </button>

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModalMascot() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-30 h-24 w-28 -translate-x-1/2 -translate-y-full">
      <motion.div
        animate={{ y: 18, rotate: -2, scale: 1 }}
        className="absolute left-1/2 top-0 h-20 w-24 -translate-x-1/2 rounded-[1.7rem] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        initial={{ y: -20, scale: 0.8 }}
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
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
