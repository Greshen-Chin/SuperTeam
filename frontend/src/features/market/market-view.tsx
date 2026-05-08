"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check, ExternalLink, Loader2, Pencil, Search, ShieldCheck, SlidersHorizontal, Store, Tag, X
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { payForLicense } from "@/lib/blockchain-adapter";
import { useAuth } from "@/context/AuthContext";
import { routes } from "@/lib/routes";
import { formatWallet, ipfsToHttp } from "@/lib/utils";
import type { License, Proof } from "@/shared/schemas";

const PLATFORM_FEE_BPS = 500;

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

type SortKey = "newest" | "oldest" | "price_asc" | "price_desc";

// ── Market page ───────────────────────────────────────────────────────────────

export function MarketView() {
  const { publicAddress, isLoggedIn, isLoading: authLoading } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [proofMap, setProofMap] = useState<Record<string, Proof>>({});
  const [listed, setListed] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [editingProof, setEditingProof] = useState<Proof | null>(null);
  const [buyingProof, setBuyingProof] = useState<Proof | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  // Own proofs + purchased licenses
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
        const uniqueIds = [...new Set(bought.map((l) => l.proofId))];
        const fetched = await Promise.all(uniqueIds.map((id) => apiClient.getProof(id).catch(() => null)));
        const map: Record<string, Proof> = {};
        for (const p of fetched) { if (p) map[p.id] = p; }
        setProofMap(map);
      })
      .finally(() => setLoading(false));
  }, [publicAddress]);

  // Marketplace listings (exclude own)
  useEffect(() => {
    setBrowseLoading(true);
    apiClient.listForSaleProofs({ excludeWallet: publicAddress ?? undefined, limit: 50 })
      .then(({ proofs: items }) => setListed(items))
      .finally(() => setBrowseLoading(false));
  }, [publicAddress]);

  const filteredListed = useMemo(() => {
    let items = listed;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.creatorHandle ?? "").toLowerCase().includes(q) ||
          p.creatorWallet.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "oldest":  return [...items].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
      case "price_asc":  return [...items].sort((a, b) => a.licenseFeeLamports - b.licenseFeeLamports);
      case "price_desc": return [...items].sort((a, b) => b.licenseFeeLamports - a.licenseFeeLamports);
      default:        return [...items].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
    }
  }, [listed, query, sort]);

  function handlePriceSaved(updated: Proof) {
    setProofs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingProof(null);
  }

  function handleLicensePurchased(license: License) {
    setLicenses((prev) => [license, ...prev]);
  }

  const listedProofs = proofs.filter((p) => p.licenseFeeLamports > 0);
  const unlistedProofs = proofs.filter((p) => p.licenseFeeLamports === 0);

  if (authLoading) {
    return (
      <div className="market-page">
        <div className="market-loading"><Loader2 size={22} className="market-spinner" /><span>Loading…</span></div>
      </div>
    );
  }

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
      <div className="market-hero">
        <div>
          <p className="market-eyebrow">LICENSE MARKETPLACE</p>
          <h1>Content Licensing</h1>
          <p className="market-subtitle">
            Buy verified licenses for creator content. Every purchase is recorded on Solana — no disputes, no takedowns.
          </p>
        </div>
        <div className="market-stats">
          <div className="market-stat">
            <strong>{browseLoading ? "—" : listed.length}</strong>
            <span>For Sale</span>
          </div>
          <div className="market-stat-divider" />
          <div className="market-stat">
            <strong>{loading ? "—" : listedProofs.length}</strong>
            <span>Your Listings</span>
          </div>
          <div className="market-stat-divider" />
          <div className="market-stat">
            <strong className="text-mint">{loading ? "—" : licenses.length}</strong>
            <span>Licenses Held</span>
          </div>
        </div>
      </div>

      {/* ── Browse Marketplace ── */}
      <section className="market-section">
        <div className="market-section-header">
          <Store size={15} />
          <h2>Browse Marketplace</h2>
          <span className="market-section-count">
            {browseLoading ? "…" : `${filteredListed.length} listing${filteredListed.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Search + Sort toolbar */}
        <div className="market-toolbar">
          <div className="market-search-wrap">
            <Search size={14} className="market-search-icon" />
            <input
              className="market-search-input"
              placeholder="Search by title or creator…"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="market-search-clear" type="button" onClick={() => setQuery("")}>
                <X size={12} />
              </button>
            )}
          </div>
          <div className="market-sort-wrap">
            <SlidersHorizontal size={13} className="market-sort-icon" />
            <select
              className="market-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
          </div>
        </div>

        {browseLoading ? (
          <div className="market-loading"><Loader2 size={18} className="market-spinner" /><span>Loading listings…</span></div>
        ) : filteredListed.length === 0 ? (
          <div className="market-empty">
            {query ? (
              <>
                <p>No listings match &quot;{query}&quot;.</p>
                <button className="market-empty-link" type="button" onClick={() => setQuery("")}>Clear search</button>
              </>
            ) : (
              <>
                <p>No videos listed for sale yet.</p>
                <p className="market-empty-hint">Be the first — upload a video and set a license price.</p>
              </>
            )}
          </div>
        ) : (
          <div className="market-browse-grid">
            {filteredListed.map((proof) => (
              <BrowseCard key={proof.id} proof={proof} onBuy={() => setBuyingProof(proof)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Your Listings ── */}
      {loading ? (
        <div className="market-loading"><Loader2 size={22} className="market-spinner" /><span>Loading your market data…</span></div>
      ) : (
        <>
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
                  <ListingCard key={proof.id} proof={proof} onEdit={() => setEditingProof(proof)} />
                ))}
                {unlistedProofs.map((proof) => (
                  <ListingCard key={proof.id} proof={proof} onEdit={() => setEditingProof(proof)} />
                ))}
              </div>
            )}
          </section>

          <section className="market-section">
            <div className="market-section-header">
              <ShieldCheck size={15} />
              <h2>Purchased Licenses</h2>
              <span className="market-section-count">{licenses.length} licenses</span>
            </div>
            {licenses.length === 0 ? (
              <div className="market-empty">
                <p>You haven&apos;t purchased any licenses yet.</p>
                <p className="market-empty-hint">Browse listings above and click &quot;Buy License&quot; to get started.</p>
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

      {editingProof && (
        <SetPriceModal
          proof={editingProof}
          walletAddress={publicAddress}
          onClose={() => setEditingProof(null)}
          onSaved={handlePriceSaved}
        />
      )}
      {buyingProof && (
        <BuyLicensePanel
          proof={buyingProof}
          buyerWallet={publicAddress ?? ""}
          onClose={() => setBuyingProof(null)}
          onPurchased={handleLicensePurchased}
        />
      )}
    </div>
  );
}

// ── Browse card ───────────────────────────────────────────────────────────────

function BrowseCard({ proof, onBuy }: { proof: Proof; onBuy: () => void }) {
  const thumb = ipfsToHttp(proof.ipfsThumbnailUri);
  const creatorLabel = proof.creatorHandle ?? formatWallet(proof.creatorWallet);

  return (
    <div className="browse-card">
      <Link className="browse-card-thumb" href={routes.certificate(proof.id)} tabIndex={-1}>
        {thumb ? (
          <img src={thumb} alt={proof.title} className="browse-card-img" loading="lazy" />
        ) : (
          <div className="browse-card-placeholder">
            <ShieldCheck size={28} className="browse-card-placeholder-icon" />
          </div>
        )}
        <div className="browse-card-proof-badge">
          <ShieldCheck size={10} />
          Verified
        </div>
      </Link>

      <div className="browse-card-body">
        <Link className="browse-card-title" href={routes.certificate(proof.id)}>
          {proof.title}
        </Link>
        <p className="browse-card-creator">by {creatorLabel}</p>

        <div className="browse-card-footer">
          <div>
            <span className="market-sol-badge browse-sol-badge">◎ {lamportsToSol(proof.licenseFeeLamports)}</span>
            <span className="browse-card-creator-gets">
              creator gets ◎ {lamportsToSol(creatorReceives(proof.licenseFeeLamports))}
            </span>
          </div>
          <button className="browse-buy-btn" type="button" onClick={onBuy}>
            <Tag size={11} />
            Buy License
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Buy license panel ─────────────────────────────────────────────────────────

type BuyStep = "confirm" | "paying" | "done" | "error";

function BuyLicensePanel({
  proof, buyerWallet, onClose, onPurchased
}: {
  proof: Proof;
  buyerWallet: string;
  onClose: () => void;
  onPurchased: (license: License) => void;
}) {
  const [step, setStep] = useState<BuyStep>("confirm");
  const [license, setLicense] = useState<License | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const thumb = ipfsToHttp(proof.ipfsThumbnailUri);
  const feeLamports = proof.licenseFeeLamports;
  const platformFee = Math.floor((feeLamports * PLATFORM_FEE_BPS) / 10_000);
  const creatorAmount = feeLamports - platformFee;

  async function handlePay() {
    if (!buyerWallet) { setErrorMsg("Connect your wallet first."); setStep("error"); return; }
    setStep("paying");
    try {
      const { signature } = await payForLicense({ proofId: proof.id, buyerWallet, sellerWallet: proof.creatorWallet, feeLamports });
      const created = await apiClient.createLicense({ proofId: proof.id, buyerWallet, feeLamports, solanaSignature: signature });
      setLicense(created);
      onPurchased(created);
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setStep("error");
    }
  }

  return (
    <div className="market-modal-backdrop" onMouseDown={onClose}>
      <div className="market-modal buy-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="market-modal-header">
          <Tag size={16} />
          <div>
            <h3>Buy a License</h3>
            <p>{proof.title}</p>
          </div>
          <button className="market-modal-close" type="button" onClick={onClose}><X size={15} /></button>
        </div>

        {step === "confirm" && (
          <div className="market-modal-body">
            {thumb && (
              <img src={thumb} alt={proof.title} className="buy-panel-thumb" />
            )}

            <div className="market-split-preview">
              <div className="market-split-row">
                <span>License price</span>
                <strong>◎ {lamportsToSol(feeLamports)} SOL</strong>
              </div>
              <div className="market-split-row">
                <span>Creator receives (95%)</span>
                <span className="text-mint">◎ {lamportsToSol(creatorAmount)} SOL</span>
              </div>
              <div className="market-split-row">
                <span>VidChain fee (5%)</span>
                <span className="market-split-fee">◎ {lamportsToSol(platformFee)} SOL</span>
              </div>
            </div>

            <div className="buy-includes">
              <p className="buy-includes-title">Your license includes:</p>
              {["Blockchain-verified usage certificate", "On-chain proof of legitimate purchase", "Downloadable license PDF", "Share with YouTube, TikTok, any platform"].map((item) => (
                <div className="buy-include-item" key={item}><Check size={11} />{item}</div>
              ))}
            </div>

            {!buyerWallet && <p className="market-modal-error">Connect your wallet before purchasing.</p>}

            <div className="market-modal-footer">
              <button className="market-cancel-btn" type="button" onClick={onClose}>Cancel</button>
              <button className="market-save-btn" disabled={!buyerWallet} type="button" onClick={handlePay}>
                <Tag size={14} />
                Confirm &amp; Pay ◎ {lamportsToSol(feeLamports)}
              </button>
            </div>
          </div>
        )}

        {step === "paying" && (
          <div className="market-modal-body buy-state">
            <Loader2 size={28} className="market-spinner" />
            <p className="buy-state-title">Processing payment…</p>
            <p className="buy-state-sub">Sending to Solana · do not close this window.</p>
          </div>
        )}

        {step === "done" && license && (
          <div className="market-modal-body buy-state">
            <div className="buy-done-icon"><Check size={20} /></div>
            <p className="buy-state-title">License purchased!</p>
            <p className="buy-state-sub">Your blockchain-verified certificate is ready.</p>
            <Link className="market-save-btn" href={routes.license(license.id)} onClick={onClose}>
              View license certificate <ExternalLink size={13} />
            </Link>
          </div>
        )}

        {step === "error" && (
          <div className="market-modal-body buy-state">
            <p className="buy-state-title buy-state-error">Payment failed</p>
            <p className="buy-state-sub">{errorMsg}</p>
            <div className="market-modal-footer">
              <button className="market-cancel-btn" type="button" onClick={onClose}>Close</button>
              <button className="market-save-btn" type="button" onClick={() => setStep("confirm")}>Try again</button>
            </div>
          </div>
        )}
      </div>
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
          View certificate <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}

// ── Set price modal ───────────────────────────────────────────────────────────

function SetPriceModal({ proof, walletAddress, onClose, onSaved }: {
  proof: Proof; walletAddress: string | null; onClose: () => void; onSaved: (updated: Proof) => void;
}) {
  const { refreshJwt } = useAuth();
  const [sol, setSol] = useState(proof.licenseFeeLamports > 0 ? lamportsToSol(proof.licenseFeeLamports) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const feeLamports = solToLamports(sol);
  const creatorSol = feeLamports > 0 ? lamportsToSol(creatorReceives(feeLamports)) : "0";
  const platformSol = feeLamports > 0 ? lamportsToSol(Math.floor((feeLamports * PLATFORM_FEE_BPS) / 10_000)) : "0";

  async function doSave() {
    const updated = await apiClient.setLicenseTerms(proof.id, { feeLamports, licenseModel: "flat", walletAddress });
    setSaved(true);
    setTimeout(() => onSaved(updated), 800);
  }

  async function handleSave() {
    if (feeLamports <= 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await doSave();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save.";
      if (msg.toLowerCase().includes("session") || msg.toLowerCase().includes("expired")) {
        try { await refreshJwt(); await doSave(); }
        catch (retryErr) { setSaveError(retryErr instanceof Error ? retryErr.message : "Please log out and back in."); }
      } else {
        setSaveError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="market-modal-backdrop" onMouseDown={onClose}>
      <div className="market-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="market-modal-header">
          <Tag size={16} />
          <div><h3>Set License Price</h3><p>{proof.title}</p></div>
          <button className="market-modal-close" type="button" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="market-modal-body">
          <label className="market-price-label">License price (SOL)</label>
          <div className="market-price-input-wrap">
            <span className="market-price-prefix">◎</span>
            <input ref={inputRef} className="market-price-input" inputMode="decimal" min="0.001" placeholder="e.g. 2" step="0.001" type="number" value={sol} onChange={(e) => setSol(e.target.value)} />
            <span className="market-price-suffix">SOL</span>
          </div>
          {feeLamports > 0 && (
            <div className="market-split-preview">
              <div className="market-split-row"><span>You receive</span><strong className="text-mint">◎ {creatorSol} SOL</strong></div>
              <div className="market-split-row"><span>VidChain fee (5%)</span><span className="market-split-fee">◎ {platformSol} SOL</span></div>
            </div>
          )}
          <p className="market-modal-hint">Buyers get a blockchain-verified license certificate.</p>
        </div>
        {saveError && <p className="market-modal-error">{saveError}</p>}
        <div className="market-modal-footer">
          <button className="market-cancel-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="market-save-btn" disabled={feeLamports <= 0 || saving} type="button" onClick={handleSave}>
            {saving ? <><Loader2 size={14} className="market-btn-spinner" />Saving…</> : saved ? <><Check size={14} />Saved!</> : "Set Price"}
          </button>
        </div>
      </div>
    </div>
  );
}
