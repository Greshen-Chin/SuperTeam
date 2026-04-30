"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type BoxesCoreProps = {
  className?: string;
  rows?: number;
  cols?: number;
};

const colors = [
  "rgba(125, 211, 252, 0.82)",
  "rgba(249, 168, 212, 0.78)",
  "rgba(134, 239, 172, 0.78)",
  "rgba(253, 224, 71, 0.74)",
  "rgba(252, 165, 165, 0.78)",
  "rgba(216, 180, 254, 0.82)",
  "rgba(147, 197, 253, 0.8)",
  "rgba(165, 180, 252, 0.78)",
  "rgba(196, 181, 253, 0.8)"
];

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

export const BoxesCore = ({ className, rows = 34, cols = 24, ...rest }: BoxesCoreProps) => {
  const rowItems = React.useMemo(() => new Array(rows).fill(1), [rows]);
  const colItems = React.useMemo(() => new Array(cols).fill(1), [cols]);

  return (
    <div
      style={{ transform: "translate(-42%,-62%) skewX(-48deg) skewY(14deg) scale(1.06) translateZ(0)" }}
      className={cn(
        "absolute -top-1/4 left-1/4 z-0 flex h-full w-full -translate-x-1/2 -translate-y-1/2 p-4",
        className
      )}
      {...rest}
    >
      {rowItems.map((_, i) => (
        <div
          className="relative h-8 w-16 border-l border-cyan-300/45 dark:border-cyan-300/45"
          key={`row-${i}`}
        >
          {colItems.map((_, j) => (
            <motion.div
              className="relative h-8 w-16 border-r border-t border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.1)] transition-colors dark:border-cyan-300/40"
              key={`col-${i}-${j}`}
              whileHover={{
                backgroundColor: getRandomColor(),
                boxShadow: "0 0 44px rgba(125, 211, 252, 0.78), inset 0 0 18px rgba(255, 255, 255, 0.22)",
                scale: 1.16,
                transition: { duration: 0 }
              }}
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-[22px] -top-[14px] h-6 w-10 stroke-[1px] text-cyan-100/60 dark:text-cyan-100/60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);

export function BackgroundBoxes({ className, rows, cols }: BoxesCoreProps) {
  return (
    <div className={cn("absolute inset-0 z-0 overflow-hidden bg-black", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_44%,rgba(14,165,233,0.48),transparent_32%),radial-gradient(circle_at_66%_54%,rgba(168,85,247,0.5),transparent_36%),radial-gradient(circle_at_50%_82%,rgba(45,212,191,0.28),transparent_30%)]" />
      <motion.div
        animate={{ opacity: [0.82, 1, 0.82], x: [-10, 10, -10], y: [8, -8, 8] }}
        className="absolute inset-0"
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      >
        <Boxes className="pointer-events-auto" cols={cols} rows={rows} />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_58%,rgba(0,0,0,0.22)_80%,rgba(0,0,0,0.72)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-black/72 to-transparent" />
    </div>
  );
}
