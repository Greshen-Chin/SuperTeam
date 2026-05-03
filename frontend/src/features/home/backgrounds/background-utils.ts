export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, alpha = 0.22) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#05050a";
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

export function createStaticLayer(width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void) {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return null;
  drawFn(ctx);
  return offscreen;
}

export function drawBatchedDots(ctx: CanvasRenderingContext2D, dots: { color: string; radius: number; x: number; y: number }[]) {
  const colors = [...new Set(dots.map((dot) => dot.color))];
  colors.forEach((color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    dots.forEach((dot) => {
      if (dot.color !== color) return;
      ctx.moveTo(dot.x + dot.radius, dot.y);
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
    });
    ctx.fill();
  });
}

export function wrap(value: number, max: number) {
  if (value < 0) return value + max;
  if (value > max) return value - max;
  return value;
}
