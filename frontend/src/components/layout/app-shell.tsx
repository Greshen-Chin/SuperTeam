"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ProfileModal } from "@/features/profile/profile-modal";
import { useCreatorProfile } from "@/lib/use-creator-profile";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Archive, Search, Tag, UploadCloud, Wallet } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn, formatWallet } from "@/lib/utils";
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

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isHome = pathname === routes.home;
  const { isLoggedIn, publicAddress } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { profile, hasName } = useCreatorProfile();
  const launchHref = routes.register;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
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
          ) : (
            <>
              {publicAddress ? (
                <button className="wallet-pill" type="button" aria-label={`Connected wallet ${publicAddress}`} onClick={() => setProfileOpen(true)}>
                  <span className="wallet-dot" />
                  {formatWallet(publicAddress)}
                </button>
              ) : null}
            </>
          )}
          <button
            className={hasName ? "nav-avatar nav-avatar-has-profile" : "nav-avatar"}
            type="button"
            aria-label="Open creator profile"
            title={hasName ? `Profile: ${profile.channelName}` : "Set up creator profile"}
            onClick={() => setProfileOpen(true)}
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

      <main>{children}</main>
    </div>
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
