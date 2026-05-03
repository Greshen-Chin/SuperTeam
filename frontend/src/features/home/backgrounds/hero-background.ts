import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas, drawBatchedDots, wrap } from "./background-utils";
import { ObjectPool } from "../systems/object-pool";

type FloatingIcon = {
  color: string;
  depth: number;
  icon: "camera" | "chain" | "shield" | "sol";
  phase: number;
  radius: number;
  speed: number;
  x: number;
  y: number;
};

export class HeroBackground extends BackgroundBase {
  private readonly icons = new ObjectPool<FloatingIcon>(() => ({
    color: "#14F195",
    depth: 1,
    icon: "shield",
    phase: Math.random() * Math.PI * 2,
    radius: 10,
    speed: 0.2,
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight
  }), 30);

  constructor(context: BackgroundContext) {
    super(context);
    for (let index = 0; index < this.profile.heroIcons; index += 1) {
      const entry = this.icons.acquire();
      if (!entry) continue;
      entry.obj.color = index % 3 === 0 ? "#14F195" : index % 3 === 1 ? "#9945FF" : "#67e8f9";
      entry.obj.depth = 0.45 + (index % 3) * 0.3;
      entry.obj.icon = index % 4 === 0 ? "chain" : index % 4 === 1 ? "shield" : index % 4 === 2 ? "camera" : "sol";
      entry.obj.phase = index * 0.71;
      entry.obj.radius = 8 + (index % 5) * 2;
      entry.obj.speed = 0.18 + (index % 4) * 0.04;
      entry.obj.x = (index * 149) % Math.max(1, this.width);
      entry.obj.y = (index * 97) % Math.max(1, this.height);
    }
  }

  override onQualityChange(level: "high" | "low" | "medium") {
    super.onQualityChange(level);
    this.icons.resize(level === "low" ? 10 : level === "medium" ? 18 : this.profile.heroIcons);
  }

  protected draw(timestamp: number) {
    clearCanvas(this.ctx, this.width, this.height, 0.1);
    const dots: { color: string; radius: number; x: number; y: number }[] = [];
    this.icons.forEach((icon) => {
      const repulse = this.profile.heroMouseRepulsion ? Math.max(0, 1 - Math.hypot(icon.x - this.mouseX, icon.y - this.mouseY) / 180) : 0;
      icon.x += Math.cos(timestamp * 0.0003 + icon.phase) * icon.depth + (icon.x - this.mouseX) * repulse * 0.018;
      icon.y = wrap(icon.y - icon.speed * icon.depth - repulse * 1.4, this.height + 40);
      if (icon.y > this.height) icon.x = (icon.x + 137) % this.width;
      dots.push({ color: "rgba(0,0,0,0.18)", radius: icon.radius + 2, x: icon.x + 3, y: icon.y + 3 });
      dots.push({ color: icon.color, radius: icon.radius * icon.depth, x: icon.x, y: icon.y });
    });
    this.ctx.globalAlpha = 0.16;
    drawBatchedDots(this.ctx, dots);
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new HeroBackground(context);
}
