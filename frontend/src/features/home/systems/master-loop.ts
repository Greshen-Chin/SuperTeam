type LoopTask = {
  fn: (timestamp: number) => void;
  priority: number;
};

class MasterLoopController {
  private frameCount = 0;
  private lastFpsTime = 0;
  private rafId: number | null = null;
  private readonly tasks = new Map<string, LoopTask>();
  private throttle = 1;

  fps = 60;

  add(id: string, fn: (timestamp: number) => void, priority = 5) {
    this.tasks.set(id, { fn, priority });
    if (this.rafId === null) this.start();
  }

  remove(id: string) {
    this.tasks.delete(id);
    if (this.tasks.size === 0) this.pause();
  }

  pause() {
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  resume() {
    if (this.rafId === null && this.tasks.size > 0) this.start();
  }

  setThrottle(value: number) {
    this.throttle = Math.max(0.1, Math.min(1, value));
  }

  private start() {
    let lastRun = 0;
    const loop = (timestamp: number) => {
      if (this.lastFpsTime === 0) this.lastFpsTime = timestamp;
      if (timestamp - this.lastFpsTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsTime = timestamp;
      }
      this.frameCount += 1;

      if (timestamp - lastRun >= (1 - this.throttle) * 100) {
        lastRun = timestamp;
        const sorted = [...this.tasks.values()].sort((first, second) => first.priority - second.priority);
        sorted.forEach(({ fn }) => {
          try {
            fn(timestamp);
          } catch (error) {
            console.warn("[MasterLoop] Task error:", error);
          }
        });
      }

      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }
}

export const MasterLoop = new MasterLoopController();

export function installLoopVisibilityControls() {
  const visibility = () => {
    if (document.hidden) MasterLoop.pause();
    else MasterLoop.resume();
  };
  const blur = () => MasterLoop.setThrottle(0.1);
  const focus = () => MasterLoop.setThrottle(1);

  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", blur);
  window.addEventListener("focus", focus);

  return () => {
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", focus);
  };
}
