"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ProfileModal } from "@/features/profile/profile-modal";
import { useCreatorProfile } from "@/lib/use-creator-profile";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Archive, LockKeyhole, Search, Tag, UploadCloud, Wallet } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const AuthModal = dynamic(
  () => import("@/components/auth/auth-modal").then((mod) => mod.AuthModal),
  { ssr: false }
);

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { href: routes.register, label: "Upload", icon: UploadCloud },
  { href: routes.check, label: "Check", icon: Search },
  { href: routes.videoStorage, label: "Vault", icon: Archive },
  { href: routes.market, label: "Market", icon: Tag }
];

const homeNavItems = [
  { href: "#problem", label: "Risk" },
  { href: "#how", label: "Flow" },
  { href: "#phash", label: "Copy Check" },
  { href: "#dispute", label: "Report" },
  { href: "#cta", label: "Try" }
];

const protectedRoutes = [
  routes.register,
  routes.check,
  routes.verify,
  routes.videoStorage,
  routes.nftStorage,
  routes.collection,
  routes.market,
  routes.wallet,
  routes.users,
  routes.dashboard
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === routes.home;
  const { isLoggedIn, isLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { profile, hasName } = useCreatorProfile();
  const launchHref = routes.register;
  const protectedPath = isProtectedPath(pathname);
  const locked = protectedPath && !isLoading && !isLoggedIn;

  useEffect(() => {
    if (!locked) return;
    setAuthOpen(true);
  }, [locked]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} redirectTo={protectedPath ? pathname : launchHref} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <header className={cn("navbar", isHome && "home-navbar")}>
        <Link className="nav-logo" href={routes.home}>
          <RobotLogo />
          <span>VidChain</span>
        </Link>

        <nav className="nav-center" aria-label="Primary navigation">
          {isHome
            ? homeNavItems.map((item) => (
                <Link className="nav-item home-nav-item" href={item.href} key={item.href}>
                  <span>{item.label}</span>
                </Link>
              ))
            : navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link className={cn("nav-item", pathname === item.href && "active")} href={item.href} key={item.href}>
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
        </nav>

        <div className="nav-right">
          {isHome ? (
            isLoggedIn ? (
              <Link className="home-nav-launch" href={launchHref} prefetch>
                Launch app
              </Link>
            ) : (
              <button className="home-nav-launch" onClick={() => setAuthOpen(true)} type="button">
                Launch app
              </button>
            )
          ) : null}
          <button
            className={hasName ? "nav-avatar nav-avatar-has-profile" : "nav-avatar"}
            type="button"
            aria-label={isLoggedIn ? "Open creator profile" : "Login to edit profile"}
            title={isLoggedIn ? (hasName ? `Profile: ${profile.channelName}` : "Set up creator profile") : "Login to edit profile"}
            onClick={() => {
              if (isLoggedIn) {
                setProfileOpen(true);
                return;
              }
              setAuthOpen(true);
            }}
          >
            <span className="nav-avatar-inner">
              {hasName
                ? <span className="nav-avatar-initials">{profile.channelName.slice(0, 2).toUpperCase()}</span>
                : <Wallet size={15} />}
            </span>
            {!hasName && isLoggedIn ? <span className="nav-avatar-dot" /> : null}
          </button>
        </div>
      </header>
      {isHome ? (
        <nav className="home-mobile-dock" aria-label="Landing sections mobile">
          {homeNavItems.map((item) => (
            <Link className="home-mobile-dock-item" href={item.href} key={item.href}>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      ) : (
        <nav className="app-mobile-dock" aria-label="App navigation mobile">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link className={cn("app-mobile-dock-item", pathname === item.href && "active")} href={item.href} key={item.href}>
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <main>
        {locked ? (
          <LockedAppSurface
            onBackHome={() => router.push(routes.home)}
            onLogin={() => setAuthOpen(true)}
          />
        ) : children}
      </main>
    </div>
  );
}

function LockedAppSurface({ onBackHome, onLogin }: { onBackHome: () => void; onLogin: () => void }) {
  return (
    <section className="locked-app-surface">
      <div className="locked-app-card">
        <span className="locked-app-icon">
          <LockKeyhole size={26} />
        </span>
        <p className="locked-app-kicker">PRIVATE WORKSPACE</p>
        <h1>Login dulu untuk buka VidChain.</h1>
        <p>Upload, Check, Vault, dan Market hanya bisa diakses setelah wallet kamu terhubung.</p>
        <div className="locked-app-actions">
          <button type="button" onClick={onLogin}>Continue login</button>
          <button type="button" onClick={onBackHome}>Back home</button>
        </div>
      </div>
    </section>
  );
}

function RobotLogo() {
  return (
    <svg className="nav-robot-logo" width="24" height="24" viewBox="0 0 64 64" aria-hidden>
      <rect className="nav-robot-logo-bg" width="64" height="64" rx="16" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 15v6" strokeWidth="3.2" />
        <path d="M26 15h12" strokeWidth="3.2" />
        <rect x="15" y="23" width="34" height="28" rx="6.5" strokeWidth="4.6" />
        <path d="M15 36H9v9h6M49 36h6v9h-6" strokeWidth="4.2" />
        <path d="M25 34v7M39 34v7" strokeWidth="4.4" />
        <path d="M26 48h12" strokeWidth="3.4" />
      </g>
    </svg>
  );
}
