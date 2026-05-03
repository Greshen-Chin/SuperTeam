"use client";

import { useEffect, useRef } from "react";
import { BackgroundProxy, createBackgroundContext, isBackgroundName } from "../systems/background-proxy";
import { installLoopVisibilityControls, MasterLoop } from "../systems/master-loop";
import { QualityManager } from "../systems/quality-manager";
import { createVisualProfile } from "../systems/profile";

type OptimizedBackgroundCanvasProps = {
  activeSection: string;
};

export function OptimizedBackgroundCanvas({ activeSection }: OptimizedBackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const proxyRef = useRef<BackgroundProxy | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const profile = createVisualProfile();
    if (profile.maxParticles <= 40) {
      canvas.style.display = "none";
      return;
    }
    const context = createBackgroundContext(canvas, profile);
    if (!context) return;

    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.1 : 1.5);
    let scrollY = window.scrollY;
    let lastScrollY = scrollY;

    const resize = () => {
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      proxyRef.current?.onResize();
    };
    const move = (event: MouseEvent) => proxyRef.current?.onMouseMove(event.clientX, event.clientY);
    const touch = (event: TouchEvent) => {
      const point = event.touches[0];
      if (point) proxyRef.current?.onMouseMove(point.clientX, point.clientY);
    };
    const scroll = () => {
      scrollY = window.scrollY;
    };

    resize();
    const proxy = new BackgroundProxy(context);
    proxyRef.current = proxy;
    void proxy.activate("hero");

    const cleanupVisibility = installLoopVisibilityControls();
    const unsubscribeQuality = QualityManager.subscribe((level) => proxy.onQualityChange(level));
    QualityManager.start();

    MasterLoop.add("home-scroll-update", () => {
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;
      ["hero", "problem", "solution", "how", "phash", "dispute", "cta"].forEach((id) => {
        if (!isBackgroundName(id)) return;
        const element = document.getElementById(id);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const range = window.innerHeight + rect.height;
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / Math.max(1, range)));
        proxy.onScroll(id, progress, delta);
      });
    }, 2);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });

    return () => {
      cleanupVisibility();
      unsubscribeQuality();
      QualityManager.stop();
      MasterLoop.remove("home-scroll-update");
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("scroll", scroll);
      proxy.destroy();
      proxyRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isBackgroundName(activeSection)) return;
    void proxyRef.current?.activate(activeSection);
  }, [activeSection]);

  return <canvas aria-hidden className="pointer-events-none fixed inset-0 z-[1] opacity-80 mix-blend-screen will-change-transform" ref={canvasRef} />;
}
