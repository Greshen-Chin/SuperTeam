"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isHome = pathname === routes.home;

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

          {isHome ? null : (
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
