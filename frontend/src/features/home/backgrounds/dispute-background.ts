import { BackgroundBase, type BackgroundContext } from "./background-base";
import { clearCanvas, wrap } from "./background-utils";

type Row = {
  kind: "normal" | "report";
  text: string;
  y: number;
};

export class DisputeBackground extends BackgroundBase {
  private lastReport = 0;
  private readonly rows: Row[] = Array.from({ length: 30 }, (_, index) => ({
    kind: index % 8 === 0 ? "report" : "normal",
    text: index % 8 === 0 ? "REPORT SENT  video copy flagged" : `proof checked  ${Math.floor(10000 + index * 771).toString(16)}...`,
    y: index * 28
  }));

  protected draw(timestamp: number) {
    clearCanvas(this.ctx, this.width, this.height, 0.18);
    if (timestamp - this.lastReport > 6000) {
      this.lastReport = timestamp;
      const row = this.rows[0];
      if (row) {
        row.kind = "report";
        row.text = "REPORT SENT  copied video marked";
      }
    }
    this.ctx.font = "11px monospace";
    this.rows.forEach((row, index) => {
      row.y = wrap(row.y - 0.42 - Math.abs(this.scrollDelta) * 0.02, this.height + 28);
      const hot = row.kind === "report" && timestamp - this.lastReport < 2000;
      this.ctx.globalAlpha = hot ? 0.34 : 0.08 + (index % 4) * 0.01;
      this.ctx.fillStyle = row.kind === "report" ? "#ff4444" : "#f8fafc";
      this.ctx.fillText(row.text, 24 + (index % 3) * 20, row.y);
    });
    this.ctx.globalAlpha = 1;
  }
}

export function createBackground(context: BackgroundContext) {
  return new DisputeBackground(context);
}
