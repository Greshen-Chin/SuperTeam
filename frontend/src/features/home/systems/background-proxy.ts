import { assets } from "./asset-proxy";
import type { VisualProfile } from "./profile";
import { isBackgroundModule, type BackgroundBase, type BackgroundContext } from "../backgrounds/background-base";

type BackgroundName = "cta" | "dispute" | "hero" | "how" | "phash" | "problem" | "royalties" | "solution";
type BackgroundFactory = () => Promise<unknown>;

const backgroundLoaders = new Map<BackgroundName, BackgroundFactory>([
  ["hero", () => import("../backgrounds/hero-background")],
  ["problem", () => import("../backgrounds/problem-background")],
  ["solution", () => import("../backgrounds/solution-background")],
  ["how", () => import("../backgrounds/circuit-background")],
  ["phash", () => import("../backgrounds/phash-background")],
  ["royalties", () => import("../backgrounds/royalties-background")],
  ["dispute", () => import("../backgrounds/dispute-background")],
  ["cta", () => import("../backgrounds/cta-background")]
]);

export class BackgroundProxy {
  private active: BackgroundName | null = null;
  private readonly systems = new Map<BackgroundName, BackgroundBase>();

  constructor(private readonly context: BackgroundContext) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") return value.bind(target);
        if (typeof prop === "string" && isBackgroundName(prop)) {
          return {
            activate: () => target.activate(prop),
            deactivate: () => target.deactivate(prop),
            isActive: () => target.active === prop
          };
        }
        return value;
      }
    });
  }

  async activate(name: BackgroundName) {
    if (this.active === name) return;
    const next = await this.getSystem(name);
    if (!next) return;
    this.systems.forEach((system, systemName) => {
      if (systemName !== name) system.pause();
    });
    next.start();
    this.active = name;
  }

  deactivate(name: BackgroundName) {
    const system = this.systems.get(name);
    system?.pause();
    if (this.active === name) this.active = null;
  }

  destroy() {
    this.systems.forEach((system) => system.destroy());
    this.systems.clear();
    this.active = null;
  }

  onMouseMove(x: number, y: number) {
    this.systems.get(this.active ?? "hero")?.onMouseMove(x, y);
  }

  onQualityChange(level: "high" | "low" | "medium") {
    this.systems.forEach((system) => system.onQualityChange(level));
  }

  onResize() {
    this.systems.forEach((system) => system.resize());
  }

  onScroll(name: BackgroundName, progress: number, delta: number) {
    this.systems.get(name)?.onScroll(progress, delta);
  }

  private async getSystem(name: BackgroundName) {
    const current = this.systems.get(name);
    if (current) return current;

    const loader = backgroundLoaders.get(name);
    if (!loader) return null;
    const loadedModule = await assets.load(`bg-${name}`, loader, name === "hero" ? "critical" : "normal");
    if (!isBackgroundModule(loadedModule)) return null;
    const system = loadedModule.createBackground(this.context);
    this.systems.set(name, system);
    return system;
  }
}

export function isBackgroundName(value: string): value is BackgroundName {
  return value === "cta" || value === "dispute" || value === "hero" || value === "how" || value === "phash" || value === "problem" || value === "royalties" || value === "solution";
}

export function createBackgroundContext(canvas: HTMLCanvasElement, profile: VisualProfile) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return { canvas, ctx, profile };
}
