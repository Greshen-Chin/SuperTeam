"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Grid2X2, List, Loader2, Plus, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { routes } from "@/lib/routes";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { Proof } from "@/shared/schemas";

type SortOrder = "latest" | "oldest";
type ViewMode = "grid" | "list";

const CARD_COLORS = ["#9945FF", "#14F195", "#FFB347", "#4E9BFF", "#FF6BFF", "#FF6B6B"];

export function CollectionView() {
  const { publicAddress, isLoggedIn } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  useEffect(() => {
    if (!publicAddress) return;
    setLoading(true);
    setError(null);
    apiClient.listProofs(publicAddress, { limit: 50 })
      .then(({ proofs: items }) => setProofs(items))
      .catch(() => setError("Failed to load proofs. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [publicAddress]);

  const visibleProofs = [...proofs].sort((a, b) => {
    const diff = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
    return sortOrder === "latest" ? -diff : diff;
  });

  return (
    <div className="collection-page">
      <section className="collection-hero">
        <div>
          <p className="collection-label">MY COLLECTION</p>
          <h1>Your protected videos.</h1>
          <p>Every video you mint lives here forever on Solana.</p>
        </div>

        <div className="collection-hero-right">
          <div className="collection-stats">
            <div>
              <strong>{loading ? "—" : proofs.length}</strong>
              <span>Videos Protected</span>
            </div>
            <i />
            <div>
              <strong className="text-mint">{proofs.length > 0 ? `◎ ${(proofs.length * 0.002).toFixed(3)}` : "◎ 0"}</strong>
              <span>SOL Spent</span>
            </div>
          </div>
          <Link className="protect-new-btn" href={routes.register}>
            <Plus size={15} />
            Protect New Video
          </Link>
        </div>
      </section>

      <section className="collection-filter-bar">
        <div className="filter-pills">
          <button className="filter-pill active" type="button">
            All ({proofs.length})
          </button>
        </div>

        <div className="collection-tools">
          <div className="view-toggle" aria-label="View mode">
            <button className={cn(viewMode === "grid" && "active")} type="button" aria-label="Grid view" onClick={() => setViewMode("grid")}>
              <Grid2X2 size={15} />
            </button>
            <button className={cn(viewMode === "list" && "active")} type="button" aria-label="List view" onClick={() => setViewMode("list")}>
              <List size={15} />
            </button>
          </div>
          <label className="sort-select">
            <SlidersHorizontal size={14} />
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </label>
        </div>
      </section>

      <section className={cn("nft-grid", viewMode === "list" && "nft-list")}>
        {loading ? (
          <div className="collection-empty">
            <Loader2 size={32} className="collection-spinner" />
            <p>Loading your vault…</p>
          </div>
        ) : error ? (
          <div className="collection-empty">
            <p>{error}</p>
          </div>
        ) : !isLoggedIn ? (
          <div className="collection-empty">
            <ShieldCheck size={32} />
            <p>Connect your wallet to view your vault.</p>
          </div>
        ) : visibleProofs.length === 0 ? (
          <div className="collection-empty">
            <ShieldCheck size={32} />
            <p>No proofs yet. <Link href={routes.register}>Protect your first video.</Link></p>
          </div>
        ) : (
          visibleProofs.map((proof, index) => (
            <NftCard key={proof.id} proof={proof} index={index} viewMode={viewMode} />
          ))
        )}
      </section>
    </div>
  );
}

function NftCard({ proof, index, viewMode }: { proof: Proof; index: number; viewMode: ViewMode }) {
  const color = CARD_COLORS[index % CARD_COLORS.length] ?? "#9945FF";
  const shortId = String(index + 1).padStart(4, "0");
  const date = new Date(proof.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const hash = `${proof.sha256.slice(0, 8)}…`;
  const sig = proof.solanaSignature.startsWith("demo_") || proof.solanaSignature.startsWith("mock_")
    ? "Devnet"
    : `${proof.solanaSignature.slice(0, 8)}…`;

  return (
    <Link href={routes.certificate(proof.id)} className="nft-card-link">
      <article className="nft-card" data-category="video" style={{ "--card-color": color } as CSSProperties}>
        <div className="nft-art">
          <div className="nft-art-orbit" />
          <div className="nft-play-tile">
            <ShieldCheck size={30} />
          </div>
          <span className="nft-id">#{shortId}</span>
          <span className="nft-category">{proof.status}</span>
        </div>

        <div className="nft-card-body">
          <div className="nft-title-row">
            <div>
              <h2>{proof.title}</h2>
              <p>{date}</p>
            </div>
            <span className="verified-pill">{proof.status}</span>
          </div>

          <div className="nft-meta-grid">
            <div>
              <span>Hash</span>
              <strong>{hash}</strong>
            </div>
            <div>
              <span>Signature</span>
              <strong>{sig}</strong>
            </div>
            {proof.creatorHandle ? (
              <div>
                <span>Creator</span>
                <strong>{proof.creatorHandle}</strong>
              </div>
            ) : null}
          </div>

          {viewMode === "list" ? (
            <span className="nft-open-link">Open certificate</span>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
