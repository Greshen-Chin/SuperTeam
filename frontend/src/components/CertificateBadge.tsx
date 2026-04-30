import { ShieldCheck } from "lucide-react";

export function CertificateBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
      <ShieldCheck size={16} />
      Kepemilikan ini tercatat di blockchain Solana
    </span>
  );
}
