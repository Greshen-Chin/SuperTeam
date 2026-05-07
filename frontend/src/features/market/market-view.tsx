"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check, ExternalLink, Loader2, Pencil, ShieldCheck, Tag, X
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/lib/routes";
import { formatWallet } from "@/lib/utils";
import type { License, Proof } from "@/shared/schemas";

const PLATFORM_FEE_BPS = 500; // 5%

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toFixed(3).replace(/\.?0+$/, "");
}

function solToLamports(sol: string) {
  const n = parseFloat(sol);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(n * 1_000_000_000);
}

function creatorReceives(feeLamports: number) {
  return feeLamports - Math.floor((feeLamports * PLATFORM_FEE_BPS) / 10_000);
}

// ── Market page ───────────────────────────────────────────────────────────────

export function MarketView() {
  const { publicAddress, isLoggedIn } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [proofMap, setProofMap] = useState<Record<string, Proof>>({});
  const [loading, setLoading] = useState(false);
  const [editingProof, setEditingProof] = useState<Proof | null>(null);

  useEffect(() => {
    if (!publicAddress) return;
    setLoading(true);

    Promise.all([
      apiClient.listProofs(publicAddress, { limit: 50 }),
      apiClient.getLicensesByBuyer(publicAddress)
    ])
      .then(async ([{ proofs: items }, bought]) => {
        setProofs(items);
        setLicenses(bought);

        // Fetch proof details for each unique proofId in purchased licenses
        const uniqueIds = [...new Set(bought.map((l) => l.proofId))];
        const fetched = await Promise.all(uniqueIds.map((id) => apiClient.getProof(id).catch(() => null)));
        const map: Record<string, Proof> = {};
        for (const p of fetched) {
          if (p) map[p.id] = p;
        }
        setProofMap(map);
      })
      .finally(() => setLoading(false));
  }, [publicAddress]);

  function handlePriceSaved(updated: Proof) {
    setProofs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingProof(null);
  }

  const listedProofs = proofs.filter((p) => p.licenseFeeLamports > 0);
  const unlistedProofs = proofs.filter((p) => p.licenseFeeLamports === 0);

  if (!isLoggedIn) {
    return (
      <div className="market-page">
        <div className="market-empty-auth">
          <ShieldCheck size={32} className="market-empty-icon" />
          <h2>Connect your wallet to access the market</h2>
          <p>List your protected videos for licensing or view your purchased licenses here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-page">
      {/* Header */}
      <div className="market-hero">
        <div>
          <p className="market-eyebrow">LICENSE MARKETPLACE</p>
          <h1>Content Licensing</h1>
          <p className="market-subtitle">
            List your protected videos for brand licensing. Buyers get a blockchain-verified usage certificate.
            VidChain takes a 5% platform fee — enforced on-chain.
          </p>
        </div>
        <div className="market-stats">
          <div className="market-stat">
            <strong>{loading ? "—" : listedProofs.length}</strong>
            <span>Videos Listed</span>
          </div>
          <div className="market-stat-divider" />
          <div className="market-stat">
            <strong className="text-mint">{loading ? "—" : licenses.length}</strong>
            <span>Licenses Held</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="market-loading">
          <Loader2 size={22} className="market-spinner" />
          <span>Loading your market data…</span>
        </div>
      ) : (
        <>
          {/* Your listings */}
          <section className="market-section">
            <div className="market-section-header">
              <Tag size={15} />
              <h2>Your Listings</h2>
              <span className="market-section-count">{proofs.length} videos</span>
            </div>

            {proofs.length === 0 ? (
              <div className="market-empty">
                <p>No protected videos yet.</p>
                <Link className="market-empty-link" href={routes.register}>Upload &amp; protect a video</Link>
              </div>
            ) : (
              <div className="market-grid">
                {listedProofs.map((proof) => (
                  <ListingCard
                    key={proof.id}
                    proof={proof}
                    onEdit={() => setEditingProof(proof)}
                  />
                ))}
                {unlistedProofs.map((proof) => (
                  <ListingCard
                    key={proof.id}
                    proof={proof}
                    onEdit={() => setEditingProof(proof)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Purchased licenses */}
          <section className="market-section">
            <div className="market-section-header">
              <ShieldCheck size={15} />
              <h2>Purchased Licenses</h2>
              <span className="market-section-count">{licenses.length} licenses</span>
            </div>

            {licenses.length === 0 ? (
              <div className="market-empty">
                <p>You haven&apos;t purchased any licenses yet.</p>
                <p className="market-empty-hint">Find a protected video and click &quot;Buy License&quot; on its certificate page.</p>
              </div>
            ) : (
              <div className="market-license-list">
                {licenses.map((lic) => (
                  <LicenseCard key={lic.id} license={lic} proof={proofMap[lic.proofId]} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Set price modal */}
      {editingProof ? (
        <SetPriceModal
          proof={editingProof}
          onClose={() => setEditingProof(null)}
          onSaved={handlePriceSaved}
        />
      ) : null}
    </div>
  );
}

// ── Listing card ──────────────────────────────────────────────────────────────

function ListingCard({ proof, onEdit }: { proof: Proof; onEdit: () => void }) {
  const isListed = proof.licenseFeeLamports > 0;

  return (
    <div className={`market-listing-card ${isListed ? "is-listed" : ""}`}>
      <div className="market-listing-top">
        <span className={`market-listing-status ${isListed ? "listed" : "unlisted"}`}>
          {isListed ? "Listed" : "Not listed"}
        </span>
        <Link className="market-listing-cert" href={routes.certificate(proof.id)} title="View certificate">
          <ExternalLink size={12} />
        </Link>
      </div>

      <p className="market-listing-title">{proof.title}</p>
      <p className="market-listing-date">
        Registered {new Date(proof.registeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      {isListed ? (
        <div className="market-listing-price">
          <span className="market-sol-badge">◎ {lamportsToSol(proof.licenseFeeLamports)} SOL</span>
          <span className="market-listing-fee">Creator gets ◎ {lamportsToSol(creatorReceives(proof.licenseFeeLamports))}</span>
        </div>
      ) : (
        <p className="market-listing-hint">Set a price to make this video available for licensing.</p>
      )}

      <button className="market-edit-btn" type="button" onClick={onEdit}>
        <Pencil size={12} />
        {isListed ? "Edit price" : "Set price"}
      </button>
    </div>
  );
}

// ── License card ──────────────────────────────────────────────────────────────

function LicenseCard({ license, proof }: { license: License; proof: Proof | undefined }) {
  return (
    <div className="market-license-card">
      <div className="market-license-left">
        <ShieldCheck size={16} className="market-license-icon" />
        <div>
          <p className="market-license-title">{proof?.title ?? `Proof ${license.proofId.slice(0, 8)}…`}</p>
          <p className="market-license-meta">
            From {formatWallet(license.sellerWallet)} ·{" "}
            {new Date(license.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
      <div className="market-license-right">
        <span className="market-sol-badge">◎ {lamportsToSol(license.feeLamports)}</span>
        <Link className="market-license-view" href={routes.license(license.id)}>
          View certificate
          <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}

// ── Set price modal ───────────────────────────────────────────────────────────

function SetPriceModal({
  proof,
  onClose,
  onSaved
}: {
  proof: Proof;
  onClose: () => void;
  onSaved: (updated: Proof) => void;
}) {
  const currentSol = proof.licenseFeeLamports > 0
    ? lamportsToSol(proof.licenseFeeLamports)
    : "";

  const [sol, setSol] = useState(currentSol);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const feeLamports = solToLamports(sol);
  const creatorSol = feeLamports > 0 ? lamportsToSol(creatorReceives(feeLamports)) : "0";
  const platformSol = feeLamports > 0 ? lamportsToSol(Math.floor((feeLamports * PLATFORM_FEE_BPS) / 10_000)) : "0";
  const canSave = feeLamports > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await apiClient.setLicenseTerms(proof.id, {
        feeLamports,
        licenseModel: "flat"
      });
      setSaved(true);
      setTimeout(() => onSaved(updated), 800);
    } catch {
      // silently allow retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="market-modal-backdrop" onMouseDown={onClose}>
      <div className="market-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="market-modal-header">
          <Tag size={16} />
          <div>
            <h3>Set License Price</h3>
            <p>{proof.title}</p>
          </div>
          <button className="market-modal-close" type="button" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="market-modal-body">
          <label className="market-price-label">
            License price (SOL)
          </label>
          <div className="market-price-input-wrap">
            <span className="market-price-prefix">◎</span>
            <input
              ref={inputRef}
              className="market-price-input"
              inputMode="decimal"
              min="0.001"
              placeholder="e.g. 2"
              step="0.001"
              type="number"
              value={sol}
              onChange={(e) => setSol(e.target.value)}
            />
            <span className="market-price-suffix">SOL</span>
          </div>

          {feeLamports > 0 && (
            <div className="market-split-preview">
              <div className="market-split-row">
                <span>You receive</span>
                <strong className="text-mint">◎ {creatorSol} SOL</strong>
              </div>
              <div className="market-split-row">
                <span>VidChain fee (5%)</span>
                <span className="market-split-fee">◎ {platformSol} SOL</span>
              </div>
            </div>
          )}

          <p className="market-modal-hint">
            Buyers get a blockchain-verified license certificate they can submit to YouTube, TikTok, or any platform.
            Price is locked on-chain when a buyer pays.
          </p>
        </div>

        <div className="market-modal-footer">
          <button className="market-cancel-btn" type="button" onClick={onClose}>Cancel</button>
          <button
            className="market-save-btn"
            disabled={!canSave || saving}
            type="button"
            onClick={handleSave}
          >
            {saving ? (
              <><Loader2 size={14} className="market-btn-spinner" />Saving…</>
            ) : saved ? (
              <><Check size={14} />Saved!</>
            ) : (
              "Set Price"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
