"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PageCursorVariant = "check" | "market";

export function PageCursorEffects({ variant }: { variant: PageCursorVariant }) {
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const auraRef = useRef<HTMLDivElement | null>(null);
  const burstIdRef = useRef(0);
  const readyRef = useRef(false);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
      }
      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${event.clientX - 160}px, ${event.clientY - 160}px, 0)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${event.clientX - 16}px, ${event.clientY - 16}px, 0)`;
      }
    };
    const click = (event: MouseEvent) => {
      const id = burstIdRef.current + 1;
      burstIdRef.current = id;
      setBursts((current) => [...current.slice(-4), { id, x: event.clientX, y: event.clientY }]);
      window.setTimeout(() => setBursts((current) => current.filter((burst) => burst.id !== id)), 900);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        ref={auraRef}
        className={ready ? `page-cursor-aura page-cursor-aura-${variant} ready` : `page-cursor-aura page-cursor-aura-${variant}`}
      />
      <div
        ref={ringRef}
        className={ready ? `page-cursor-ring page-cursor-ring-${variant} ready` : `page-cursor-ring page-cursor-ring-${variant}`}
      />
      <div className={`page-cursor-rails page-cursor-rails-${variant}`} aria-hidden>
        <span /><span /><span /><span />
      </div>
      {bursts.map((burst) => (
        <div className={`page-click-burst page-click-burst-${variant}`} key={burst.id} style={{ left: burst.x, top: burst.y }}>
          {Array.from({ length: 8 }, (_, index) => <span className={`page-click-spark-${index}`} key={index} />)}
        </div>
      ))}
    </>,
    document.body
  );
}
