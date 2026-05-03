"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Grid2X2, List, Plus, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NftCategory = "Music" | "Gaming" | "Tutorial" | "Kuliner" | "Other";
type Filter = "All" | NftCategory;
type ViewMode = "grid" | "list";

type PlaceholderNft = {
  id: string;
  title: string;
  category: NftCategory;
  date: string;
  hash: string;
  block: string;
  color: string;
  size: string;
  views: string;
  status: "verified";
};

const filters: Filter[] = ["All", "Music", "Gaming", "Tutorial", "Kuliner", "Other"];

const placeholderNFTs: PlaceholderNft[] = [
  { id: "0042", title: "Dance Cover - Rizky", category: "Music", date: "Dec 12, 2024", hash: "7f83b165...", block: "47,382,910", color: "#9945FF", size: "142 MB", views: "204K", status: "verified" },
  { id: "0041", title: "Minecraft Speedrun 1.21", category: "Gaming", date: "Dec 10, 2024", hash: "c4d82930...", block: "47,301,204", color: "#14F195", size: "891 MB", views: "88K", status: "verified" },
  { id: "0040", title: "Resep Rendang Mama", category: "Kuliner", date: "Dec 8, 2024", hash: "9a2b1f44...", block: "47,198,773", color: "#FFB347", size: "310 MB", views: "1.2M", status: "verified" },
  { id: "0039", title: "Cara Edit CapCut Pro", category: "Tutorial", date: "Dec 5, 2024", hash: "e7a91c02...", block: "47,022,519", color: "#4E9BFF", size: "256 MB", views: "445K", status: "verified" },
  { id: "0038", title: "Lo-fi Study Beats Mix", category: "Music", date: "Dec 1, 2024", hash: "b3f72e11...", block: "46,890,441", color: "#FF6BFF", size: "78 MB", views: "32K", status: "verified" },
  { id: "0037", title: "Unboxing iPhone 16 Pro", category: "Tutorial", date: "Nov 28, 2024", hash: "a1d45b98...", block: "46,710,882", color: "#FF6B6B", size: "1.1 GB", views: "673K", status: "verified" },
  { id: "0036", title: "Vlog Bali Day 3", category: "Other", date: "Nov 25, 2024", hash: "2c8f90d1...", block: "46,601,330", color: "#14F195", size: "2.3 GB", views: "91K", status: "verified" },
  { id: "0035", title: "Tutorial Guitar Fingerstyle", category: "Music", date: "Nov 20, 2024", hash: "f4a82c55...", block: "46,443,129", color: "#9945FF", size: "445 MB", views: "28K", status: "verified" },
  { id: "0034", title: "Reaction: MV BLACKPINK", category: "Other", date: "Nov 18, 2024", hash: "88e1b230...", block: "46,302,774", color: "#FF6BFF", size: "567 MB", views: "3.1M", status: "verified" },
  { id: "0033", title: "PUBG Mobile 1v4 Clutch", category: "Gaming", date: "Nov 15, 2024", hash: "d9c03f71...", block: "46,191,005", color: "#FFB347", size: "228 MB", views: "156K", status: "verified" },
  { id: "0032", title: "Masak Soto Betawi Khas", category: "Kuliner", date: "Nov 10, 2024", hash: "3e7c2b49...", block: "45,998,411", color: "#4E9BFF", size: "390 MB", views: "877K", status: "verified" },
  { id: "0031", title: "Cara Bikin CV ATS 2024", category: "Tutorial", date: "Nov 5, 2024", hash: "1a6d9e83...", block: "45,801,662", color: "#FF6B6B", size: "134 MB", views: "2.4M", status: "verified" }
];

export function CollectionView() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const visibleNfts = useMemo(
    () => placeholderNFTs.filter((nft) => activeFilter === "All" || nft.category === activeFilter),
    [activeFilter]
  );

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
              <strong>12</strong>
              <span>Videos Protected</span>
            </div>
            <i />
            <div>
              <strong className="text-mint">◎ 0.24</strong>
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
          {filters.map((filter) => (
            <button
              className={cn("filter-pill", activeFilter === filter && "active")}
              data-filter={filter.toLowerCase()}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
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
            <select defaultValue="latest">
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="views">Most Viewed</option>
            </select>
          </label>
        </div>
      </section>

      <section className={cn("nft-grid", viewMode === "list" && "nft-list")}>
        {visibleNfts.map((nft) => (
          <NftCard key={nft.id} nft={nft} viewMode={viewMode} />
        ))}
      </section>
    </div>
  );
}

function NftCard({ nft, viewMode }: { nft: PlaceholderNft; viewMode: ViewMode }) {
  return (
    <article className="nft-card" data-category={nft.category.toLowerCase()} style={{ "--card-color": nft.color } as CSSProperties}>
      <div className="nft-art">
        <div className="nft-art-orbit" />
        <div className="nft-play-tile">
          <ShieldCheck size={30} />
        </div>
        <span className="nft-id">#{nft.id}</span>
        <span className="nft-category">{nft.category}</span>
      </div>

      <div className="nft-card-body">
        <div className="nft-title-row">
          <div>
            <h2>{nft.title}</h2>
            <p>{nft.date}</p>
          </div>
          <span className="verified-pill">verified</span>
        </div>

        <div className="nft-meta-grid">
          <div>
            <span>Hash</span>
            <strong>{nft.hash}</strong>
          </div>
          <div>
            <span>Block</span>
            <strong>{nft.block}</strong>
          </div>
          <div>
            <span>Size</span>
            <strong>{nft.size}</strong>
          </div>
          <div>
            <span>Views</span>
            <strong>{nft.views}</strong>
          </div>
        </div>

        {viewMode === "list" ? (
          <Link className="nft-open-link" href={routes.certificate(`proof_${nft.id}`)}>
            Open certificate
          </Link>
        ) : null}
      </div>
    </article>
  );
}
