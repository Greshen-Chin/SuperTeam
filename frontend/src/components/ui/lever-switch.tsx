"use client";

import { useState } from "react";
import { Flame, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type LeverSwitchProps = {
  checked: boolean;
  leftLabel?: string;
  rightLabel?: string;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function LeverSwitch({
  checked,
  leftLabel = "Register",
  rightLabel = "Check Original",
  onCheckedChange,
  className
}: LeverSwitchProps) {
  return (
    <div className={cn("group inline-flex max-w-full items-center gap-3 sm:gap-4", className)}>
      <button
        aria-pressed={!checked}
        className={cn(
          "inline-flex text-[10px] font-black uppercase tracking-wide transition sm:text-xs",
          !checked ? "text-white" : "text-white/42 group-hover:text-white/60"
        )}
        type="button"
        onClick={() => onCheckedChange(false)}
      >
        {leftLabel}
      </button>

      <button
        aria-label={`Switch to ${checked ? leftLabel : rightLabel}`}
        className="relative h-12 w-28 rounded-full outline-none"
        type="button"
        onClick={() => onCheckedChange(!checked)}
      >
        <span className="absolute inset-x-2 bottom-1 h-7 rounded-full bg-black/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_18px_40px_rgba(0,0,0,0.45)]" />
        <span className="absolute inset-x-1 top-3 h-4 rounded-full bg-white/10 blur-sm" />
        <span className="absolute left-1/2 top-[1.3rem] h-2 w-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500/70 via-cyan-300/70 to-violet-500/70" />
        <span
          className={cn(
            "absolute top-0 grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-[0_10px_32px_rgba(255,255,255,0.22)] transition-all duration-500 ease-out",
            checked ? "translate-x-16 rotate-[18deg]" : "translate-x-0 -rotate-[18deg]"
          )}
        >
          {checked ? <Heart size={18} /> : <Flame size={18} />}
        </span>
      </button>

      <button
        aria-pressed={checked}
        className={cn(
          "inline-flex text-[10px] font-black uppercase tracking-wide transition sm:text-xs",
          checked ? "text-white" : "text-white/42 group-hover:text-white/60"
        )}
        type="button"
        onClick={() => onCheckedChange(true)}
      >
        {rightLabel}
      </button>
    </div>
  );
}

export function Component() {
  const [checked, setChecked] = useState(false);

  return <LeverSwitch checked={checked} onCheckedChange={setChecked} />;
}
