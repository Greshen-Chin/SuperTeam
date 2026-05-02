"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { routes } from "@/lib/routes";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/context/AuthContext";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === routes.home;
  const { isLoggedIn, user, loginWithGoogle, logout, isLoading } = useAuth();

  // Redirect to dashboard only on transition from logged-out → logged-in
  const prevLoggedIn = useRef(isLoggedIn);
  useEffect(() => {
    if (!prevLoggedIn.current && isLoggedIn) {
      router.push(routes.dashboard);
    }
    prevLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <header className={isHome ? "sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl" : "sticky top-0 z-40 border-b border-[var(--app-line)] bg-[var(--app-bg)]/85 backdrop-blur-xl"}>
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Link className={isHome ? "flex items-center gap-3 text-xl font-bold text-white" : "flex items-center gap-3 text-xl font-bold text-[var(--app-fg)]"} href={routes.home}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-violet-950/30">
              <ShieldCheck size={19} />
            </span>
            VidChain
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isLoggedIn ? (
              <>
                {user?.name ? (
                  <span className={isHome ? "hidden text-sm text-white/70 sm:block" : "hidden text-sm text-[var(--app-muted)] sm:block"}>
                    {user.name}
                  </span>
                ) : null}
                <button
                  className={isHome ? "h-9 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10" : "h-9 rounded-xl border border-[var(--app-line)] px-4 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--app-line)]"}
                  type="button"
                  onClick={logout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                className={isHome ? "h-9 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-50" : "h-9 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"}
                disabled={isLoading}
                type="button"
                onClick={() => void loginWithGoogle()}
              >
                {isLoading ? "Connecting..." : "Sign in"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
