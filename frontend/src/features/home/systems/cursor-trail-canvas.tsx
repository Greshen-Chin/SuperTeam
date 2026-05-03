"use client";

import { useEffect, useRef } from "react";
import { MasterLoop } from "./master-loop";

type TrailPoint = {
  hue: number;
  life: number;
  radius: number;
  x: number;
  y: number;
};

type Shockwave = {
  color: string;
  delay: number;
  life: number;
  x: number;
  y: number;
};

export function CursorTrailCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const trail: TrailPoint[] = [];
    const shocks: Shockwave[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.25);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const move = (event: MouseEvent) => {
      const speed = Math.hypot(event.movementX, event.movementY);
      trail.push({
        hue: (event.clientX + event.clientY) % 360,
        life: 1,
        radius: Math.min(10, 2 + speed * 0.18),
        x: event.clientX,
        y: event.clientY
      });
      if (trail.length > 90) trail.splice(0, trail.length - 90);
    };

    const click = (event: MouseEvent) => {
      shocks.push({ color: "#9945FF", delay: 0, life: 1, x: event.clientX, y: event.clientY });
      shocks.push({ color: "#14F195", delay: 0.1, life: 1, x: event.clientX, y: event.clientY });
      shocks.push({ color: "#ffffff", delay: 0.2, life: 1, x: event.clientX, y: event.clientY });
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (let index = trail.length - 1; index >= 0; index -= 1) {
        const point = trail[index];
        if (!point) continue;
        point.life -= 0.04;
        if (point.life <= 0) {
          trail.splice(index, 1);
          continue;
        }
        context.globalAlpha = point.life * 0.55;
        context.fillStyle = `hsl(${point.hue}, 96%, 66%)`;
        context.beginPath();
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.fill();
      }

      for (let index = shocks.length - 1; index >= 0; index -= 1) {
        const shock = shocks[index];
        if (!shock) continue;
        shock.delay -= 0.02;
        if (shock.delay > 0) continue;
        shock.life -= 0.025;
        if (shock.life <= 0) {
          shocks.splice(index, 1);
          continue;
        }
        context.globalAlpha = shock.life * 0.72;
        context.strokeStyle = shock.color;
        context.lineWidth = index % 3 === 0 ? 2 : 1;
        context.beginPath();
        context.arc(shock.x, shock.y, (1 - shock.life) * 150, 0, Math.PI * 2);
        context.stroke();
      }
      context.globalAlpha = 1;
    };

    resize();
    MasterLoop.add("cursor-trail", draw, 1);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("click", click);

    return () => {
      MasterLoop.remove("cursor-trail");
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("click", click);
    };
  }, []);

  return <canvas aria-hidden className="pointer-events-none fixed inset-0 z-[65] mix-blend-screen" ref={canvasRef} />;
}
