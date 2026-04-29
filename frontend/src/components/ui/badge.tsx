import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "green" | "amber" | "red" | "brand";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface text-ink",
  green: "bg-teal-50 text-proof-green",
  amber: "bg-amber-50 text-proof-amber",
  red: "bg-red-50 text-proof-red",
  brand: "bg-brand-50 text-brand-700"
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

