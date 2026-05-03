import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas } from "./background-utils";

const cities = [
  { name: "Jakarta", x: 0.31, y: 0.82 },
  { name: "Surabaya", x: 0.42, y: 0.81 },
  { name: "Medan", x: 0.18, y: 0.78 },
  { name: "Bandung", x: 0.3, y: 0.83 },
  { name: "Bali", x: 0.46, y: 0.835 },
  { name: "Makassar", x: 0.62, y: 0.8 },
  { name: "Jayapura", x: 0.88, y: 0.78 }
];

export class CTABackground extends BackgroundBase {
  private nearestCity: string | null = null;
  private readonly stars = Array.from({ length: 120 }, (_, index) => ({
    phase: index * 0.31,
    x: (index * 83) % Math.max(1, window.innerWidth),
    y: (index * 47) % Math.max(1, window.innerHeight * 0.8)
  }));

  protected draw(timestamp: number) {
    clearCanvas(this.ctx, this.width, this.height, 0.2);
    this.ctx.fillStyle = "#ffffff";
    this.stars.forEach((star) => {
      this.ctx.globalAlpha = 0.12 + Math.sin(timestamp * 0.001 + star.phase) * 0.06;
      this.ctx.fillRect(star.x, star.y, 1.2, 1.2);
    });

    const baseY = this.height * 0.78;
    const mapWidth = this.width * 0.88;
    const mapLeft = this.width * 0.06;
    const scaleY = this.height * 0.18;
    this.ctx.globalAlpha = 0.62;
    this.ctx.fillStyle = "rgba(20,10,40,0.82)";
    this.ctx.strokeStyle = "rgba(153,69,255,0.42)";
    this.ctx.beginPath();
    this.ctx.moveTo(mapLeft + mapWidth * 0.1, baseY + scaleY * 0.25);
    this.ctx.bezierCurveTo(mapLeft + mapWidth * 0.28, baseY, mapLeft + mapWidth * 0.36, baseY + scaleY * 0.34, mapLeft + mapWidth * 0.52, baseY + scaleY * 0.1);
    this.ctx.bezierCurveTo(mapLeft + mapWidth * 0.7, baseY - scaleY * 0.03, mapLeft + mapWidth * 0.84, baseY + scaleY * 0.08, mapLeft + mapWidth * 0.94, baseY + scaleY * 0.02);
    this.ctx.lineTo(mapLeft + mapWidth * 0.96, baseY + scaleY * 0.26);
    this.ctx.bezierCurveTo(mapLeft + mapWidth * 0.68, baseY + scaleY * 0.28, mapLeft + mapWidth * 0.46, baseY + scaleY * 0.38, mapLeft + mapWidth * 0.1, baseY + scaleY * 0.31);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    let nearestDistance = Number.POSITIVE_INFINITY;
    cities.forEach((city, index) => {
      const x = city.x * this.width;
      const y = city.y * this.height;
      const distance = Math.hypot(x - this.mouseX, y - this.mouseY);
      const hot = distance < 64;
      if (hot && distance < nearestDistance) {
        nearestDistance = distance;
        this.nearestCity = city.name;
      }
      const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.001 + index);
      this.ctx.globalAlpha = hot ? 0.95 : 0.4 + pulse * 0.25;
      this.ctx.fillStyle = "#14F195";
      this.ctx.beginPath();
      this.ctx.arc(x, y, hot ? 7 : 3.5, 0, Math.PI * 2);
      this.ctx.fill();
    });

    if (nearestDistance < 64 && this.nearestCity) {
      this.ctx.globalAlpha = 0.82;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "12px monospace";
      this.ctx.fillText(`Creator in ${this.nearestCity}`, this.mouseX + 18, this.mouseY - 18);
    }
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new CTABackground(context);
}
