"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type WalletAddressProps = {
  address: string;
};

export function WalletAddress({ address }: WalletAddressProps) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = `https://explorer.solana.com/address/${address}?cluster=devnet`;

  async function copyAddress() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={address} size={132} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">Alamat Wallet Solana</p>
          <p className="mt-2 break-all text-lg font-bold text-[var(--app-fg)]">{address}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white" type="button" onClick={copyAddress}>
              <Copy size={17} />
              {copied ? "Tersalin" : "Salin alamat"}
            </button>
            <a className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--app-line)] px-4 text-sm font-semibold text-[var(--app-fg)]" href={explorerUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={17} />
              Buka Explorer
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
