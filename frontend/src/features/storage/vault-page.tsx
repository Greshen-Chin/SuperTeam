"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Archive, ArrowUpRight, CalendarDays, FileVideo, MoreHorizontal, Search, ShieldCheck, SlidersHorizontal, UploadCloud } from "lucide-react";
import { ArtifactBadge, GlowCard } from "@/components/ui/proof-artifacts";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { formatWallet } from "@/lib/utils";
import type { Proof } from "@/shared/schemas";

type VaultFilter = "all" | "sealed" | "protected" | "for_sale";
type VaultSort = "newest" | "oldest" | "name";

const accents = ["#14F195", "#00E5C8", "#7C3AED", "#4E9BFF"];

function isVaultFilter(value: string): value is VaultFilter {
  return ["all", "sealed", "protected", "for_sale"].includes(value);
}

function isVaultSort(value: string): value is VaultSort {
  return ["newest", "oldest", "name"].includes(value);
}

export function VaultPage() {
  const { isLoggedIn, publicAddress } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [sort, setSort] = useState<VaultSort>("newest");

  useEffect(() => {
    if (!publicAddress) {
      setProofs([]);
      return;
    }
    setLoading(true);
    apiClient.listProofs(publicAddress, { limit: 50 })
      .then(({ proofs: items }) => setProofs(items))
      .catch(() => setProofs([]))
      .finally(() => setLoading(false));
  }, [publicAddress]);

  const visibleProofs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = proofs.filter((proof) => {
      const matchesQuery = !normalized ||
        proof.title.toLowerCase().includes(normalized) ||
        proof.id.toLowerCase().includes(normalized) ||
        proof.sha256.toLowerCase().includes(normalized);
      const matchesFilter =
        filter === "all" ||
        (filter === "sealed" && proof.status === "active") ||
        (filter === "protected" && proof.status !== "pending") ||
        (filter === "for_sale" && proof.licenseFeeLamports > 0);
      return matchesQuery && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      const delta = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
      return sort === "oldest" ? delta : -delta;
    });
  }, [filter, proofs, query, sort]);

  const listed = proofs.filter((proof) => proof.licenseFeeLamports > 0).length;

  return (
    <main className="vault-redesign-shell">
      <VaultSpaceCanvas />
      <VaultCursorEffects />
      <div className="vault-space-blob vault-space-blob-one" aria-hidden />
      <div className="vault-space-blob vault-space-blob-two" aria-hidden />
      <div className="vault-space-rails" aria-hidden><span /><span /><span /><span /></div>

      <section className="vault-redesign-hero">
        <div>
          <p className="vault-redesign-kicker">CREATOR VAULT</p>
          <h1>Your sealed content.</h1>
          <p className="vault-redesign-subcopy">
            One place for every VidChain proof: inspect origin records, share certificates, and prepare protected media for licensing.
          </p>
        </div>
        <div className="vault-stat-strip" aria-label="Vault summary">
          <span><strong>{proofs.length}</strong>Total</span>
          <span><strong>{listed}</strong>Listed</span>
          <span><strong>{publicAddress ? formatWallet(publicAddress) : "--"}</strong>Owner</span>
        </div>
        <Link className="vault-new-upload" href={isLoggedIn ? routes.register : routes.login}>
          <UploadCloud size={16} />
          New Upload
        </Link>
      </section>

      <section className="vault-control-bar" aria-label="Vault filters">
        <label className="vault-search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, proof ID, hash" />
        </label>
        <div className="vault-filter-group">
          <SlidersHorizontal size={15} />
          <select value={filter} onChange={(event) => { if (isVaultFilter(event.target.value)) setFilter(event.target.value); }}>
            <option value="all">All</option>
            <option value="sealed">Sealed</option>
            <option value="protected">Protected</option>
            <option value="for_sale">For sale</option>
          </select>
          <select value={sort} onChange={(event) => { if (isVaultSort(event.target.value)) setSort(event.target.value); }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="vault-redesign-grid" aria-busy>
          {Array.from({ length: 4 }, (_, index) => <div className="vault-skeleton-card" key={index} />)}
        </div>
      ) : visibleProofs.length > 0 ? (
        <section className="vault-redesign-grid" aria-label="Protected content">
          {visibleProofs.map((proof, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 10 }}
              key={proof.id}
              transition={{ delay: Math.min(index * 0.035, 0.18), duration: 0.18 }}
            >
              <VaultProofCard accent={accents[index % accents.length] ?? "#14F195"} index={index} proof={proof} />
            </motion.div>
          ))}
        </section>
      ) : (
        <GlowCard className="vault-empty-state" accent="#14F195">
          <Archive size={28} />
          <h2>{proofs.length ? "No matching proof" : "Your vault is waiting"}</h2>
          <p>{proofs.length ? "Try a different search or filter." : "Upload a video to seal the first origin proof."}</p>
          <Link href={isLoggedIn ? routes.register : routes.login}>Upload first file</Link>
        </GlowCard>
      )}
    </main>
  );
}

function VaultProofCard({ accent, index, proof }: { accent: string; index: number; proof: Proof }) {
  return (
    <GlowCard accent={accent} className="vault-proof-card">
      <div className="vault-card-media">
        <span className="vault-card-index">{String(index + 1).padStart(2, "0")}</span>
        <FileVideo size={30} />
        <i />
      </div>
      <div className="vault-card-body">
        <div className="vault-card-title-row">
          <h2>{proof.title}</h2>
          <button className="vault-card-menu" type="button" aria-label="More actions">
            <MoreHorizontal size={16} />
          </button>
        </div>
        <p className="vault-card-date">
          <CalendarDays size={13} />
          {new Date(proof.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <div className="vault-card-meta">
          <ArtifactBadge tone={proof.licenseFeeLamports > 0 ? "violet" : "mint"}>
            <ShieldCheck size={12} />
            {proof.licenseFeeLamports > 0 ? "For Sale" : "Sealed"}
          </ArtifactBadge>
          <code>{proof.id.slice(0, 16)}...</code>
        </div>
        <div className="vault-card-actions">
          <Link href={routes.certificate(proof.id)}>
            View Proof
            <ArrowUpRight size={14} />
          </Link>
          <Link href={routes.market}>License</Link>
        </div>
      </div>
    </GlowCard>
  );
}

export const VideoStorageView = VaultPage;
export const NftStorageView = VaultPage;

function VaultSpaceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let animation = 0;
    const particles = Array.from({ length: 85 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      opacity: 0.08 + Math.random() * 0.28,
      size: 0.45 + Math.random() * 1.55
    }));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const move = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const leave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const px = particle.x * width;
        const py = particle.y * height;
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const distance = Math.hypot(dx, dy) || 1;

        if (distance < 132) {
          const force = ((132 - distance) / 132) * 0.46;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }

        particle.vx += (0.5 - particle.x) * 0.00012 * width;
        particle.vy += (0.5 - particle.y) * 0.00012 * height;
        particle.vx *= 0.965;
        particle.vy *= 0.965;
        particle.x = Math.min(1, Math.max(0, particle.x + particle.vx / width));
        particle.y = Math.min(1, Math.max(0, particle.y + particle.vy / height));

        context.beginPath();
        context.fillStyle = `rgba(255,255,255,${particle.opacity})`;
        context.arc(particle.x * width, particle.y * height, particle.size, 0, Math.PI * 2);
        context.fill();
      });

      animation = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseleave", leave);

    return () => {
      window.cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);

  return <canvas className="vault-space-canvas" ref={canvasRef} aria-hidden />;
}

function VaultCursorEffects() {
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const burstIdRef = useRef(0);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      setReady(true);
      setPoint({ x: event.clientX, y: event.clientY });
    };

    const click = (event: MouseEvent) => {
      const id = burstIdRef.current + 1;
      burstIdRef.current = id;
      setBursts((current) => [...current.slice(-4), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => setBursts((current) => current.filter((burst) => burst.id !== id)), 760);
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
      <div
        className={ready ? "vault-cursor-aura ready" : "vault-cursor-aura"}
        style={{ transform: `translate3d(${point.x - 150}px, ${point.y - 150}px, 0)` }}
      />
      <div
        className={ready ? "vault-cursor-ring ready" : "vault-cursor-ring"}
        style={{ transform: `translate3d(${point.x - 17}px, ${point.y - 17}px, 0)` }}
      />
      {bursts.map((burst) => (
        <div className="vault-click-burst" key={burst.id} style={{ left: burst.x, top: burst.y }}>
          <span /><span /><span /><span /><span /><span /><span /><span />
        </div>
      ))}
    </>
  );
}
