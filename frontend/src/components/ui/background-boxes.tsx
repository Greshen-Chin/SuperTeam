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
      style={{ transform: "translate(-50%,-57%) skewX(-48deg) skewY(14deg) scale(1.28) translateZ(0)" }}
      className={cn(
        "absolute left-1/2 top-1/2 z-0 flex h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 p-4",
        className
      )}
      {...rest}
    >
      {rowItems.map((_, i) => (
        <div
          className="relative h-8 w-16 border-l border-cyan-300/50 dark:border-cyan-300/50"
          key={`row-${i}`}
        >
          {colItems.map((_, j) => (
            <motion.div
              className="relative h-8 w-16 border-r border-t border-cyan-300/45 bg-cyan-400/12 shadow-[0_0_18px_rgba(34,211,238,0.12)] transition-colors dark:border-cyan-300/45"
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_42%_38%,rgba(14,165,233,0.56),transparent_34%),radial-gradient(circle_at_62%_56%,rgba(168,85,247,0.5),transparent_36%),radial-gradient(circle_at_50%_78%,rgba(45,212,191,0.3),transparent_32%)]" />
      <motion.div
        animate={{ opacity: [0.88, 1, 0.88], x: [-8, 8, -8], y: [6, -6, 6] }}
        className="absolute inset-0"
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      >
        <Boxes className="pointer-events-auto" cols={cols} rows={rows} />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_62%,rgba(0,0,0,0.14)_80%,rgba(0,0,0,0.64)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-black/72 to-transparent" />
    </div>
  );
}
