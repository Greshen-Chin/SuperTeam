import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas, wrap } from "./background-utils";
import { ObjectPool } from "../systems/object-pool";

type GhostCard = {
  h: number;
  phase: number;
  speed: number;
  tilt: number;
  w: number;
  x: number;
  y: number;
};

export class ProblemBackground extends BackgroundBase {
  private readonly cards = new ObjectPool<GhostCard>(() => ({
    h: 72,
    phase: Math.random() * 4,
    speed: 0.4,
    tilt: 0,
    w: 128,
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight
  }), 25);

  constructor(context: BackgroundContext) {
    super(context);
    for (let index = 0; index < 25; index += 1) {
      const entry = this.cards.acquire();
      if (!entry) continue;
      entry.obj.w = 96 + (index % 5) * 24;
      entry.obj.h = entry.obj.w * 0.5625;
      entry.obj.phase = index * 0.57;
      entry.obj.speed = 0.35 + (index % 4) * 0.1;
      entry.obj.tilt = -0.18 + (index % 7) * 0.06;
      entry.obj.x = (index * 173) % Math.max(1, this.width);
      entry.obj.y = (index * 89) % Math.max(1, this.height);
    }
  }

  override onQualityChange(level: "high" | "low" | "medium") {
    super.onQualityChange(level);
    this.cards.resize(level === "low" ? 8 : level === "medium" ? 15 : 25);
  }

  protected draw(timestamp: number) {
    clearCanvas(this.ctx, this.width, this.height, 0.16);
    const speedBoost = this.scrollProgress > 0.5 ? 1 + (this.scrollProgress - 0.5) * 4 : 1;
    this.cards.forEach((card, index) => {
      card.y = wrap(card.y + card.speed * speedBoost + Math.abs(this.scrollDelta) * 0.025, this.height + card.h);
      card.x += Math.sin(timestamp * 0.0004 + card.phase) * 0.22;
      this.ctx.save();
      this.ctx.translate(card.x, card.y);
      this.ctx.rotate(card.tilt + Math.sin(timestamp * 0.001 + card.phase) * 0.04);
      this.ctx.globalAlpha = 0.05 + (index % 4) * 0.018;
      this.ctx.strokeStyle = index % 5 === 0 ? "#fb7185" : "#f8fafc";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(-card.w / 2, -card.h / 2, card.w, card.h);
      this.ctx.restore();
    });
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new ProblemBackground(context);
}
