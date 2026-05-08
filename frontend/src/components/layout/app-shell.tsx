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
          <ShieldLogo />
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

function ShieldLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden>
      <path d="M10 1L2 4.5V9c0 4.5 3.5 8.5 8 9.5C15.5 17.5 18 13.5 18 9V4.5L10 1z" fill="url(#vidchain-shield-gradient)" />
      <path d="M6.2 9.8h7.6M7.1 6.6h5.8" stroke="rgba(255,255,255,0.86)" strokeLinecap="round" strokeWidth="1.35" />
      <defs>
        <linearGradient id="vidchain-shield-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14F195" />
          <stop offset="54%" stopColor="#4E9BFF" />
          <stop offset="100%" stopColor="#9945FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
