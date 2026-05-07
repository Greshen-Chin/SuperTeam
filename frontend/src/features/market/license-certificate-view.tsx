"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { formatWallet, formatDateTime } from "@/lib/utils";
import type { License, Proof } from "@/shared/schemas";

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toFixed(3).replace(/\.?0+$/, "");
}

const PLATFORM_FEE_BPS = 500;

export function LicenseCertificateView({ id }: { id: string }) {
  const [license, setLicense] = useState<License | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getLicense(id)
      .then(async (lic) => {
        setLicense(lic);
        const p = await apiClient.getProof(lic.proofId).catch(() => null);
        setProof(p);
      })
      .catch(() => setError("License not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="license-cert-loading">
        <Loader2 size={22} className="market-spinner" />
        <span>Loading license certificate…</span>
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="license-cert-error">
        <p>{error ?? "License not found."}</p>
        <Link href="/">Return home</Link>
      </div>
    );
  }

  const feeLamports = license.feeLamports;
  const platformFee = Math.floor((feeLamports * PLATFORM_FEE_BPS) / 10_000);
  const creatorAmount = feeLamports - platformFee;
  const explorerUrl = `https://explorer.solana.com/tx/${license.solanaSignature}?cluster=devnet`;
  const isMock = license.solanaSignature.startsWith("mock_");

  return (
    <div className="license-cert-page">
      <div className="license-cert-badge">
        <ShieldCheck size={18} />
        LICENSE CERTIFICATE
      </div>

      <h1 className="license-cert-title">{proof?.title ?? `Proof ${license.proofId.slice(0, 12)}…`}</h1>
      <p className="license-cert-subtitle">
        Blockchain-verified usage rights. This certificate is public proof that the buyer holds a legitimate license
        for the content described below.
      </p>

      {/* Status banner */}
      <div className={`license-cert-banner ${license.status === "active" ? "active" : "revoked"}`}>
        <ShieldCheck size={14} />
        {license.status === "active"
          ? "License is ACTIVE — this usage right is valid and on-chain verified."
          : "License has been REVOKED by the content creator."}
      </div>

      {/* Fields */}
      <div className="license-cert-card">
        <LicenseField label="License ID" value={license.id} />
        <LicenseField label="Buyer wallet" value={formatWallet(license.buyerWallet)} />
        <LicenseField label="Creator wallet" value={formatWallet(license.sellerWallet)} />
        <LicenseField label="Licensed content" value={proof?.title ?? license.proofId} />
        <LicenseField label="Proof ID" value={license.proofId} />
        <LicenseField label="License type" value="Commercial use (flat fee)" />
        <LicenseField label="Issue date" value={formatDateTime(license.createdAt)} />
        <LicenseField label="Status" value={license.status.toUpperCase()} />
      </div>

      {/* Payment breakdown */}
      <div className="license-cert-card license-cert-payment">
        <h3 className="license-cert-card-title">Transaction Summary</h3>
        <div className="license-payment-row">
          <span>Total paid</span>
          <strong>◎ {lamportsToSol(feeLamports)} SOL</strong>
        </div>
        <div className="license-payment-row">
          <span>Creator received (95%)</span>
          <span className="text-mint">◎ {lamportsToSol(creatorAmount)} SOL</span>
        </div>
        <div className="license-payment-row">
          <span>VidChain platform fee (5%)</span>
          <span style={{ color: "var(--app-muted)" }}>◎ {lamportsToSol(platformFee)} SOL</span>
        </div>
        <div className="license-payment-sig">
          <span>Solana signature</span>
          {isMock ? (
            <span className="license-sig-mock">Demo transaction</span>
          ) : (
            <a
              className="license-sig-link"
              href={explorerUrl}
              rel="noreferrer"
              target="_blank"
            >
              {license.solanaSignature.slice(0, 16)}…
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {!isMock && (
        <a
          className="license-explorer-btn"
          href={explorerUrl}
          rel="noreferrer"
          target="_blank"
        >
          View on Solana Explorer
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

function LicenseField({ label, value }: { label: string; value: string }) {
  return (
    <div className="license-cert-field">
      <dt className="license-cert-label">{label}</dt>
      <dd className="license-cert-value">{value}</dd>
    </div>
  );
}
