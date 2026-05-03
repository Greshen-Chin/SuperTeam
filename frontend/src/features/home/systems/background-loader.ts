import { assets } from "./asset-proxy";

type StagedPreload = readonly [string, () => Promise<unknown>];

export class BackgroundLoader {
  static async startLoading() {
    await Promise.all([
      assets.load("hero-bg", () => import("../backgrounds/hero-background"), "critical"),
      assets.load("cursor-system", () => import("./cursor-system"), "critical"),
      assets.load("master-loop", () => import("./master-loop"), "critical")
    ]);

    const stagedPreloads: StagedPreload[] = [
      ["problem-bg", () => import("../backgrounds/problem-background")],
      ["solution-bg", () => import("../backgrounds/solution-background")],
      ["how-bg", () => import("../backgrounds/circuit-background")],
      ["copy-check-bg", () => import("../backgrounds/phash-background")],
      ["report-bg", () => import("../backgrounds/dispute-background")],
      ["cta-bg", () => import("../backgrounds/cta-background")]
    ];

    stagedPreloads.forEach(([key, loader], index) => {
      window.setTimeout(() => assets.preload(key, loader), 900 + index * 700);
    });

    console.info("[VidChain] Critical assets ready:", assets.stats);
  }
}
