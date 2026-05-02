"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === routes.home;
  const { isLoggedIn, isLoading, loginWithGoogle, logout, user } = useAuth();
  const prevLoggedIn = useRef(isLoggedIn);
  const navItems = isHome
    ? [
        { href: "#hero", label: "Hero" },
        { href: "#problem", label: "Problem" },
        { href: "#how", label: "How it works" },
        { href: "#phash", label: "pHash" }
      ]
    : [
        { href: routes.register, label: "Register" },
        { href: routes.verify, label: "Verify" },
        { href: routes.certificate("proof_demo"), label: "Demo" }
      ];

  useEffect(() => {
    if (!prevLoggedIn.current && isLoggedIn) {
      router.push(routes.dashboard);
    }
    prevLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <header className={isHome ? "sticky top-0 z-50 border-b border-white/10 bg-black/92 shadow-[0_18px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl" : "sticky top-0 z-40 border-b border-[var(--app-line)] bg-[var(--app-bg)]/85 backdrop-blur-xl"}>
        <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link className={isHome ? "flex items-center gap-3 text-xl font-bold text-white" : "flex items-center gap-3 text-xl font-bold text-[var(--app-fg)]"} href={routes.home}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-white shadow-lg shadow-violet-950/30">
              <ShieldCheck size={19} />
            </span>
            VidChain
          </Link>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <nav className={cn("hidden items-center gap-6 lg:flex", !isHome && "rounded-full border border-[var(--app-line)] bg-[var(--app-panel)] px-1.5 py-1")}>
              {navItems.map((item) => (
                <Link
                  className={cn(
                    isHome
                      ? "apple-nav-link relative py-2 text-sm font-bold text-white/62 transition hover:text-white"
                      : "rounded-full px-4 py-2 text-sm font-bold text-[var(--app-muted)] transition hover:bg-[var(--app-panel-strong)] hover:text-[var(--app-fg)]"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {!isHome ? <ThemeToggle /> : null}

            {isLoggedIn ? (
              <>
                {user?.name ? <span className={isHome ? "hidden text-sm text-white/70 sm:block" : "hidden text-sm text-[var(--app-muted)] sm:block"}>{user.name}</span> : null}
                <button
                  className={isHome ? "rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-black text-white/82 shadow-[0_0_34px_rgba(153,69,255,0.08)] transition hover:-translate-y-0.5 hover:border-red-200/40 hover:bg-red-200 hover:text-black" : "h-9 rounded-xl border border-[var(--app-line)] px-4 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--app-line)]"}
                  onClick={logout}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                className={isHome ? "rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-black text-white/82 shadow-[0_0_34px_rgba(153,69,255,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-200/40 hover:bg-emerald-200 hover:text-black disabled:opacity-50" : "h-9 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"}
                disabled={isLoading}
                onClick={() => void loginWithGoogle()}
                type="button"
              >
                {isLoading ? "Connecting..." : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
