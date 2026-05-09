"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Archive, ArrowUpRight, CalendarDays, FileVideo, MoreHorizontal, Search, ShieldCheck, SlidersHorizontal, Trash2, UploadCloud } from "lucide-react";
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
  const { isLoggedIn, publicAddress, refreshJwt } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultFilter>("all");
  const [sort, setSort] = useState<VaultSort>("newest");

  useEffect(() => {
    if (!publicAddress) {
      setProofs([]);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    apiClient.listAllProofs(publicAddress, { limit: 50, signal: controller.signal })
      .then((items) => {
        if (active) setProofs(items);
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setProofs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
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

  async function deleteProof(proof: Proof) {
    if (!publicAddress) return;
    const confirmed = window.confirm(`Delete "${proof.title}" from your vault? This removes the database record and cannot be undone.`);
    if (!confirmed) return;

    setVaultError(null);
    setDeletingIds((current) => new Set(current).add(proof.id));
    try {
      try {
        await apiClient.deleteProof(proof.id);
      } catch (error) {
        if (error instanceof Error && /sign in|bearer|token|auth/i.test(error.message)) {
          await refreshJwt();
          await apiClient.deleteProof(proof.id);
        } else {
          throw error;
        }
      }
      setProofs((current) => current.filter((item) => item.id !== proof.id));
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : "Failed to delete proof.");
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(proof.id);
        return next;
      });
    }
  }

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

      {vaultError ? (
        <div className="vault-inline-error" role="alert">{vaultError}</div>
      ) : null}

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
              <VaultProofCard
                accent={accents[index % accents.length] ?? "#14F195"}
                deleting={deletingIds.has(proof.id)}
                index={index}
                onDelete={deleteProof}
                proof={proof}
              />
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

function VaultProofCard({
  accent,
  deleting,
  index,
  onDelete,
  proof
}: {
  accent: string;
  deleting: boolean;
  index: number;
  onDelete: (proof: Proof) => void;
  proof: Proof;
}) {
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
          <button
            className="vault-delete-proof"
            disabled={deleting}
            onClick={() => onDelete(proof)}
            type="button"
          >
            <Trash2 size={14} />
            {deleting ? "Deleting" : "Delete"}
          </button>
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
  const auraRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let animation = 0;
    let targetX = 0;
    let targetY = 0;

    const draw = () => {
      auraRef.current?.style.setProperty("transform", `translate3d(${targetX - 150}px, ${targetY - 150}px, 0)`);
      ringRef.current?.style.setProperty("transform", `translate3d(${targetX - 17}px, ${targetY - 17}px, 0)`);
      animation = 0;
    };

    const scheduleDraw = () => {
      if (animation === 0) animation = window.requestAnimationFrame(draw);
    };

    const move = (event: MouseEvent) => {
      if (!readyRef.current) {
        readyRef.current = true;
        auraRef.current?.classList.add("ready");
        ringRef.current?.classList.add("ready");
      }
      targetX = event.clientX;
      targetY = event.clientY;
      scheduleDraw();
    };

    const click = (event: MouseEvent) => {
      const burst = document.createElement("div");
      burst.className = "vault-click-burst";
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      for (let i = 0; i < 8; i += 1) {
        burst.appendChild(document.createElement("span"));
      }
      document.body.appendChild(burst);
      window.setTimeout(() => burst.remove(), 760);
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => {
      if (animation !== 0) window.cancelAnimationFrame(animation);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, []);

  return (
    <>
      <div
        ref={auraRef}
        className="vault-cursor-aura"
      />
      <div
        ref={ringRef}
        className="vault-cursor-ring"
      />
    </>
  );
}
