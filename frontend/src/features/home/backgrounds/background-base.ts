import { MasterLoop } from "../systems/master-loop";
import type { QualityLevel } from "../systems/quality-manager";
import type { VisualProfile } from "../systems/profile";

export type BackgroundContext = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  profile: VisualProfile;
};

export abstract class BackgroundBase {
  protected active = false;
  protected height = 1;
  protected mouseX = -9999;
  protected mouseY = -9999;
  protected quality: QualityLevel = "high";
  protected scrollDelta = 0;
  protected scrollProgress = 0;
  protected width = 1;

  protected readonly canvas: HTMLCanvasElement;
  protected readonly ctx: CanvasRenderingContext2D;
  protected readonly profile: VisualProfile;

  constructor({ canvas, ctx, profile }: BackgroundContext) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.profile = profile;
    this.resize();
  }

  start() {
    if (this.active) return;
    this.active = true;
    MasterLoop.add(this.taskId, (timestamp) => this.draw(timestamp), 4);
  }

  pause() {
    this.active = false;
    MasterLoop.remove(this.taskId);
  }

  resume() {
    this.start();
  }

  destroy() {
    this.pause();
    this.cleanup();
  }

  onMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  onQualityChange(level: QualityLevel) {
    this.quality = level;
  }

  onScroll(progress: number, delta: number) {
    this.scrollProgress = progress;
    this.scrollDelta = delta;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  protected abstract draw(timestamp: number): void;

  protected cleanup() {}

  private get taskId() {
    return `background:${this.constructor.name}`;
  }
}

export type BackgroundModule = {
  createBackground: (context: BackgroundContext) => BackgroundBase;
};

export function isBackgroundModule(value: unknown): value is BackgroundModule {
  if (!value || typeof value !== "object") return false;
  return "createBackground" in value && typeof value.createBackground === "function";
}
