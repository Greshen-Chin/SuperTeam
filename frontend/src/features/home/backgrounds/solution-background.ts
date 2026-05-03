import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas } from "./background-utils";

type StarCard = {
  phase: number;
  size: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

export class SolutionBackground extends BackgroundBase {
  private readonly stars: StarCard[] = Array.from({ length: 120 }, (_, index) => ({
    phase: index * 0.41,
    size: 2 + (index % 3),
    targetX: 0,
    targetY: 0,
    x: (index * 113) % Math.max(1, window.innerWidth),
    y: (index * 67) % Math.max(1, window.innerHeight)
  }));

  protected draw() {
    clearCanvas(this.ctx, this.width, this.height, 0.12);
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const converge = Math.sin(this.scrollProgress * Math.PI);
    this.ctx.strokeStyle = "rgba(20,241,149,0.045)";
    this.ctx.beginPath();
    this.stars.forEach((star, index) => {
      const baseX = (index * 113) % this.width;
      const baseY = (index * 67) % this.height;
      const burst = Math.max(0, this.scrollProgress - 0.72) * 3;
      star.targetX = baseX + (centerX - baseX) * converge - Math.cos(star.phase) * burst * 220;
      star.targetY = baseY + (centerY - baseY) * converge - Math.sin(star.phase) * burst * 160;
      star.x += (star.targetX - star.x) * 0.04;
      star.y += (star.targetY - star.y) * 0.04;
      if (index % 9 === 0) this.ctx.moveTo(star.x, star.y);
      if (index % 9 === 4) this.ctx.lineTo(star.x, star.y);
    });
    this.ctx.stroke();
    this.ctx.globalAlpha = 0.22;
    this.ctx.fillStyle = "#14F195";
    this.stars.forEach((star) => {
      this.ctx.fillRect(star.x, star.y, star.size, star.size * 1.35);
    });
    this.ctx.globalAlpha = 0.035;
    this.ctx.font = "900 160px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("VDC", centerX, centerY + 52);
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new SolutionBackground(context);
}
