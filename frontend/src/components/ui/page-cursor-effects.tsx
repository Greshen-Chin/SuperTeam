"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PageCursorVariant = "check" | "market";

export function PageCursorEffects({ variant }: { variant: PageCursorVariant }) {
  const [mounted, setMounted] = useState(false);
  const auraRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(false);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let animation = 0;
    let targetX = 0;
    let targetY = 0;

    const draw = () => {
      const aura = auraRef.current;
      const ring = ringRef.current;
      if (aura) {
        aura.style.transform = `translate3d(${targetX - 160}px, ${targetY - 160}px, 0)`;
      }
      if (ring) {
        ring.style.transform = `translate3d(${targetX - 16}px, ${targetY - 16}px, 0)`;
      }
      animation = 0;
    };

    const scheduleDraw = () => {
      if (animation === 0) animation = window.requestAnimationFrame(draw);
    };

    const move = (event: MouseEvent) => {
      if (!readyRef.current) {
        readyRef.current = true;
        auraRef.current?.classList.add("ready");
        ringRef.current?.classList.add("ready");
      }
      targetX = event.clientX;
      targetY = event.clientY;
      scheduleDraw();
    };

    const click = (event: MouseEvent) => {
      const burst = document.createElement("div");
      burst.className = `page-click-burst page-click-burst-${variant}`;
      burst.style.left = `${event.clientX}px`;
      burst.style.top = `${event.clientY}px`;
      for (let i = 0; i < 8; i += 1) {
        const spark = document.createElement("span");
        spark.className = `page-click-spark-${i}`;
        burst.appendChild(spark);
      }
      document.body.appendChild(burst);
      window.setTimeout(() => burst.remove(), 900);
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => {
      if (animation !== 0) window.cancelAnimationFrame(animation);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, [variant]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        ref={auraRef}
        className={`page-cursor-aura page-cursor-aura-${variant}`}
      />
      <div
        ref={ringRef}
        className={`page-cursor-ring page-cursor-ring-${variant}`}
      />
      <div className={`page-cursor-rails page-cursor-rails-${variant}`} aria-hidden>
        <span /><span /><span /><span />
      </div>
    </>,
    document.body
  );
}
