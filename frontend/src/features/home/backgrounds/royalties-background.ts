import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas, wrap } from "./background-utils";

type Coin = {
  phase: number;
  rotation: number;
  size: number;
  x: number;
  y: number;
};

export class RoyaltiesBackground extends BackgroundBase {
  private readonly coins: Coin[] = Array.from({ length: 15 }, (_, index) => ({
    phase: index * 0.55,
    rotation: index * 0.2,
    size: 14 + (index % 5) * 2,
    x: (index * 127) % Math.max(1, window.innerWidth),
    y: (index * 83) % Math.max(1, window.innerHeight)
  }));

  protected draw(timestamp: number) {
    clearCanvas(this.ctx, this.width, this.height, 0.1);
    const ripple = Math.min(42, Math.abs(this.scrollDelta) * 0.9);
    for (let band = 0; band < 3; band += 1) {
      const gradient = this.ctx.createLinearGradient(0, this.height * (0.25 + band * 0.18), this.width, this.height * (0.4 + band * 0.18));
      gradient.addColorStop(0, "rgba(250,204,21,0)");
      gradient.addColorStop(0.5, `rgba(250,204,21,${0.05 + band * 0.025})`);
      gradient.addColorStop(1, "rgba(20,241,149,0)");
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 28 + band * 14;
      this.ctx.beginPath();
      for (let x = 0; x < this.width; x += 34) {
        const y = this.height * (0.26 + band * 0.18) + Math.sin(x * 0.01 + timestamp * 0.001 + band) * (18 + ripple);
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
    this.coins.forEach((coin) => {
      coin.y = wrap(coin.y - 0.22, this.height + 30);
      coin.rotation += 0.012;
      this.ctx.save();
      this.ctx.translate(coin.x, coin.y);
      this.ctx.rotate(coin.rotation);
      this.ctx.globalAlpha = 0.14;
      this.ctx.strokeStyle = "#facc15";
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
      this.ctx.moveTo(-coin.size * 0.45, -coin.size * 0.2);
      this.ctx.lineTo(coin.size * 0.42, -coin.size * 0.2);
      this.ctx.moveTo(-coin.size * 0.28, coin.size * 0.22);
      this.ctx.lineTo(coin.size * 0.58, coin.size * 0.22);
      this.ctx.stroke();
      this.ctx.restore();
    });
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new RoyaltiesBackground(context);
}
