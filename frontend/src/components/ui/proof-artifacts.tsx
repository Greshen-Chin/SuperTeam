"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type GlowCardProps = {
  accent?: string;
  children: ReactNode;
  className?: string;
};

export function GlowCard({ accent = "#14F195", children, className }: GlowCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const style: CSSProperties & { "--artifact-accent": string } = { "--artifact-accent": accent };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const move = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      element.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    element.addEventListener("mousemove", move, { passive: true });
    return () => element.removeEventListener("mousemove", move);
  }, []);

  return (
    <div className={cn("artifact-card", className)} ref={ref} style={style}>
      {children}
    </div>
  );
}

export function ArtifactBadge({
  children,
  tone = "mint"
}: {
  children: ReactNode;
  tone?: "mint" | "violet" | "neutral";
}) {
  return <span className={`artifact-badge artifact-badge-${tone}`}>{children}</span>;
}

export function HashDisplay({
  copied,
  label,
  onCopy,
  value,
  wide
}: {
  copied: boolean;
  label: string;
  onCopy: (label: string, value: string) => Promise<void>;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "hash-display hash-display-wide" : "hash-display"}>
      <dt>{label}</dt>
      <dd>
        <code title={value}>{value}</code>
        <button type="button" onClick={() => void onCopy(label, value)} aria-label={`Copy ${label}`}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </dd>
    </div>
  );
}
