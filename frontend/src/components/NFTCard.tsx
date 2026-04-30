import Link from "next/link";
import { CalendarDays, Film } from "lucide-react";
import type { VidChainNft } from "@/utils/metaplex";

export function NFTCard({ nft }: { nft: VidChainNft }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)]">
      <div className="grid aspect-video place-items-center bg-[var(--app-bg-soft)]">
        {nft.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={nft.title} className="h-full w-full object-cover" src={nft.thumbnail} />
        ) : (
          <Film className="text-[var(--app-muted)]" size={44} />
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-bold text-[var(--app-fg)]">{nft.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--app-muted)]">{nft.description}</p>
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--app-muted)]">
          <CalendarDays size={14} />
          {nft.registeredAt ? new Date(nft.registeredAt).toLocaleString("id-ID") : "Waktu belum tersedia"}
        </p>
        <Link className="mt-4 inline-flex text-sm font-semibold text-[#2f81f7]" href={nft.certificateUrl}>
          Buka sertifikat
        </Link>
      </div>
    </article>
  );
}
