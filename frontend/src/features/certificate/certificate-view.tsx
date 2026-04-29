import { ExternalLink, Share2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatWallet } from "@/lib/utils";
import type { Proof } from "@/shared/schemas";

type CertificateViewProps = {
  proof: Proof;
};

export function CertificateView({ proof }: CertificateViewProps) {
  const explorerUrl = `https://explorer.solana.com/tx/${proof.solanaSignature}?cluster=devnet`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Badge tone="green">Registered on Solana</Badge>
        <h1 className="mt-3 text-3xl font-bold text-ink md:text-4xl">{proof.title}</h1>
        <p className="mt-3 text-muted">
          Public proof certificate for creator attribution. This is timestamped evidence, not a legal copyright guarantee.
        </p>
      </div>

      <Card className="space-y-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <ShieldCheck />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Proof Certificate</h2>
            <p className="text-sm text-muted">Shareable origin evidence for platforms, brands, agencies, and communities.</p>
          </div>
        </div>

        <dl className="grid gap-4 md:grid-cols-2">
          <CertificateField label="Creator" value={proof.creatorHandle ?? formatWallet(proof.creatorWallet)} />
          <CertificateField label="Registered" value={formatDateTime(proof.registeredAt)} />
          <CertificateField label="Proof ID" value={proof.id} />
          <CertificateField label="Creator wallet" value={formatWallet(proof.creatorWallet)} />
          <CertificateField label="Fingerprint root" value={proof.fingerprintRoot} wide />
          <CertificateField label="SHA-256" value={proof.sha256} wide />
        </dl>

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            href={explorerUrl}
            rel="noreferrer"
            target="_blank"
          >
            View Transaction
            <ExternalLink size={16} />
          </a>
          <Button type="button" variant="secondary">
            <Share2 size={16} />
            Share Certificate
          </Button>
        </div>
      </Card>
    </div>
  );
}

type CertificateFieldProps = {
  label: string;
  value: string;
  wide?: boolean;
};

function CertificateField({ label, value, wide }: CertificateFieldProps) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      <dd className="mt-1 break-all rounded-lg bg-surface px-3 py-2 text-sm text-muted">{value}</dd>
    </div>
  );
}

