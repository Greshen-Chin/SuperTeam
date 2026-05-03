"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import { ArrowRight, FileVideo, HardDrive, Layers3, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";
import { routes } from "@/lib/routes";

const vaultItems = [
  { title: "Dance Cover - Rizky", meta: "NFT #0042", tone: "purple" },
  { title: "Minecraft Speedrun", meta: "NFT #0041", tone: "mint" },
  { title: "Resep Rendang Mama", meta: "NFT #0040", tone: "amber" }
];

const videoItems = [
  { title: "morning-market-story.mp4", size: "42 MB", status: "Pinned" },
  { title: "capcut-edit-master.mov", size: "256 MB", status: "Replicated" },
  { title: "bali-day-three.mp4", size: "2.3 GB", status: "Cold vault" }
];

export function CheckPageView() {
  return (
    <StorageShell
      eyebrow="VIDEO CHECK"
      title="Drop it. Catch the copy."
      icon={<Search size={28} />}
      cta="Check now"
      href={routes.verify}
      variant="check"
    >
      <Link className="check-lab-card action-hook" href={routes.verify} aria-label="Start a video check">
        <div className="check-orbit-stage">
          <div className="check-radar">
            <span />
            <span />
            <span />
            <Search size={34} />
          </div>
          <i />
          <b />
        </div>
        <div className="check-signal-list">
          {["SHA-256", "pHash", "Registry"].map((item, index) => (
            <div className="check-signal" key={item}>
              <span>{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
        <span className="hook-caption">tap / drop</span>
      </Link>
    </StorageShell>
  );
}

export function NftStorageView() {
  return (
    <StorageShell
      eyebrow="PROOF VAULT"
      title="Proofs stacked clean."
      icon={<Layers3 size={28} />}
      cta="Open vault"
      href={routes.collection}
      variant="nft"
    >
      <Link className="storage-card-grid proof-stack-hook action-hook" href={routes.collection} aria-label="Open proof vault">
        {vaultItems.map((item) => (
          <div className={`mini-proof-card ${item.tone}`} key={item.title}>
            <ShieldCheck size={26} />
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
        ))}
        <span className="hook-caption proof-hook-caption">open / inspect</span>
      </Link>
    </StorageShell>
  );
}

export function VideoStorageView() {
  return (
    <StorageShell
      eyebrow="VIDEO VAULT"
      title="Originals, ready."
      icon={<HardDrive size={28} />}
      cta="Upload"
      href={routes.register}
      variant="video"
    >
      <Link className="video-upload-hook action-hook" href={routes.register} aria-label="Upload a new video">
        <UploadCloud size={30} />
        <span>Drop original</span>
        <ArrowRight size={16} />
      </Link>
      <div className="video-storage-list">
        {videoItems.map((item) => (
          <div className="video-storage-row" key={item.title}>
            <span className="video-storage-icon">
              <FileVideo size={18} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.size}</small>
            </div>
            <em>{item.status}</em>
          </div>
        ))}
      </div>
    </StorageShell>
  );
}

function StorageShell({
  eyebrow,
  title,
  icon,
  cta,
  href,
  variant,
  children
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  cta: string;
  href: string;
  variant: "check" | "nft" | "video";
  children: ReactNode;
}) {
  return (
    <main className={`storage-page-shell storage-${variant}`}>
      <StorageCursor variant={variant} />
      <div className="storage-wallpaper-rails" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <SparklesCore
        background="transparent"
        minSize={0.4}
        maxSize={1.3}
        particleDensity={85}
        className="storage-sparkles"
        particleColor="#FFFFFF"
        speed={0.8}
      />
      <section className="storage-hero-card">
        <div className="storage-hero-copy">
          <span className="storage-icon">{icon}</span>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <Link className="storage-cta" href={href}>
            {cta}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="storage-visual">
          {children}
        </div>
      </section>
    </main>
  );
}

function StorageCursor({ variant }: { variant: "check" | "nft" | "video" }) {
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [trail, setTrail] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [clicks, setClicks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const idRef = useRef(0);
  const trailIdRef = useRef(0);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      setReady(true);
      setPoint({ x: event.clientX, y: event.clientY });
      const id = trailIdRef.current + 1;
      trailIdRef.current = id;
      setTrail((current) => [...current.slice(-14), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => {
        setTrail((current) => current.filter((item) => item.id !== id));
      }, 720);
    };
    const click = (event: MouseEvent) => {
      const id = idRef.current + 1;
      idRef.current = id;
      setClicks((current) => [...current.slice(-5), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => {
        setClicks((current) => current.filter((item) => item.id !== id));
      }, 900);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, []);

  return (
    <>
      <div className={ready ? `storage-cursor storage-cursor-${variant} ready` : `storage-cursor storage-cursor-${variant}`} style={{ transform: `translate3d(${point.x - 22}px, ${point.y - 22}px, 0)` }} />
      <div className={ready ? `storage-cursor-wash storage-cursor-wash-${variant} ready` : `storage-cursor-wash storage-cursor-wash-${variant}`} style={{ transform: `translate3d(${point.x - 180}px, ${point.y - 180}px, 0)` }} />
      <div className={ready ? `storage-cursor-core storage-cursor-core-${variant} ready` : `storage-cursor-core storage-cursor-core-${variant}`} style={{ transform: `translate3d(${point.x - 5}px, ${point.y - 5}px, 0)` }} />
      {trail.map((item, index) => (
        <span className={`storage-trail storage-trail-${variant}`} key={item.id} style={{ left: item.x, opacity: (index + 1) / 16, top: item.y }} />
      ))}
      {clicks.map((click) => (
        <div className={`storage-click storage-click-${variant}`} key={click.id} style={{ left: click.x, top: click.y }}>
          {Array.from({ length: variant === "video" ? 6 : 10 }, (_, index) => <span key={index} style={{ "--burst-angle": `${index * (variant === "video" ? 60 : 36)}deg` } as CSSProperties} />)}
        </div>
      ))}
    </>
  );
}
