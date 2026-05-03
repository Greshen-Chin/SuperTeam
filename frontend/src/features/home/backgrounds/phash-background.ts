import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas, createStaticLayer, wrap } from "./background-utils";

type RainDrop = {
  char: string;
  speed: number;
  x: number;
  y: number;
};

export class PHashBackground extends BackgroundBase {
  private hexLayer: HTMLCanvasElement | null = null;
  private readonly rain: RainDrop[] = Array.from({ length: 60 }, (_, index) => ({
    char: index % 2 ? "1" : "0",
    speed: 0.7 + (index % 5) * 0.15,
    x: (index * 61) % Math.max(1, window.innerWidth),
    y: (index * 101) % Math.max(1, window.innerHeight)
  }));

  override resize() {
    super.resize();
    const cell = this.profile.phashBg === "canvas" && this.profile.maxParticles > 100 ? 48 : 80;
    this.hexLayer = createStaticLayer(this.width, this.height, (ctx) => {
      ctx.strokeStyle = "rgba(103,232,249,0.055)";
      for (let x = -cell; x < this.width + cell; x += cell) {
        for (let y = -cell; y < this.height + cell; y += cell * 0.86) {
          ctx.beginPath();
          for (let side = 0; side < 6; side += 1) {
            const angle = Math.PI / 3 * side;
            const px = x + Math.cos(angle) * cell * 0.42;
            const py = y + Math.sin(angle) * cell * 0.42;
            if (side === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    });
  }

  protected draw() {
    clearCanvas(this.ctx, this.width, this.height, 0.12);
    if (this.hexLayer) this.ctx.drawImage(this.hexLayer, 0, 0);
    this.ctx.font = "12px monospace";
    this.ctx.fillStyle = "#67e8f9";
    this.rain.forEach((drop, index) => {
      drop.y = wrap(drop.y + drop.speed, this.height + 20);
      this.ctx.globalAlpha = 0.08 + (index % 5) * 0.03;
      this.ctx.fillText(drop.char, drop.x, drop.y);
      if (drop.y > this.height - 28) {
        this.ctx.globalAlpha = 0.16;
        this.ctx.beginPath();
        this.ctx.arc(drop.x, this.height - 24, 12, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new PHashBackground(context);
}
