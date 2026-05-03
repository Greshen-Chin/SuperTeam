import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas, createStaticLayer } from "./background-utils";

type Pulse = {
  life: number;
  x: number;
  y: number;
};

export class CircuitBackground extends BackgroundBase {
  private pulses: Pulse[] = [];
  private staticLayer: HTMLCanvasElement | null = null;

  override resize() {
    super.resize();
    this.staticLayer = createStaticLayer(this.width, this.height, (ctx) => {
      ctx.strokeStyle = "rgba(153,69,255,0.08)";
      ctx.fillStyle = "rgba(20,241,149,0.14)";
      for (let x = 0; x < this.width; x += 72) {
        for (let y = 0; y < this.height; y += 72) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 72, y);
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 72);
          ctx.stroke();
        }
      }
    });
  }

  override onMouseMove(x: number, y: number) {
    super.onMouseMove(x, y);
    if (this.pulses.length < 18 && Math.random() > 0.88) this.pulses.push({ life: 1, x, y });
  }

  protected draw() {
    clearCanvas(this.ctx, this.width, this.height, 0.08);
    if (this.staticLayer) this.ctx.drawImage(this.staticLayer, 0, 0);
    this.pulses = this.pulses.filter((pulse) => pulse.life > 0);
    this.pulses.forEach((pulse) => {
      pulse.life -= 0.022;
      this.ctx.globalAlpha = pulse.life * 0.5;
      this.ctx.strokeStyle = "#14F195";
      this.ctx.beginPath();
      this.ctx.arc(pulse.x, pulse.y, (1 - pulse.life) * 170, 0, Math.PI * 2);
      this.ctx.stroke();
    });
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new CircuitBackground(context);
}
