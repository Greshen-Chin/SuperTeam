import { MasterLoop } from "./master-loop";

export type QualityLevel = "high" | "low" | "medium";

class QualityManagerController {
  private listeners = new Set<(level: QualityLevel) => void>();
  private timer: number | null = null;

  level: QualityLevel = "high";

  start() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.update(MasterLoop.fps), 3000);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(listener: (level: QualityLevel) => void) {
    this.listeners.add(listener);
    listener(this.level);
    return () => this.listeners.delete(listener);
  }

  update(fps: number) {
    const next = fps < 30 ? "low" : fps < 50 && this.level === "high" ? "medium" : fps > 58 ? "high" : this.level;
    if (next === this.level) return;
    this.level = next;
    this.listeners.forEach((listener) => listener(next));
  }
}

export const QualityManager = new QualityManagerController();
