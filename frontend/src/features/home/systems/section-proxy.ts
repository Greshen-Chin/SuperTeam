type SectionModule = {
  destroy?: (element: Element) => void;
  init?: (element: Element) => void | Promise<void>;
};

export class SectionProxy {
  private loaded = false;
  private loading: Promise<void> | null = null;
  private module: SectionModule | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(
    private readonly sectionId: string,
    private readonly importFn: () => Promise<SectionModule>
  ) {
    this.observe();
  }

  async init() {
    await this.ensureLoaded();
  }

  destroy() {
    const element = document.getElementById(this.sectionId);
    if (element && this.module?.destroy) this.module.destroy(element);
    this.observer?.disconnect();
    this.observer = null;
  }

  private observe() {
    const element = document.getElementById(this.sectionId);
    if (!element) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !this.loaded) void this.ensureLoaded();
      },
      { rootMargin: "200px" }
    );
    this.observer.observe(element);
  }

  private async ensureLoaded() {
    if (this.loaded) return;
    if (this.loading) return this.loading;

    this.loading = this.importFn().then(async (module) => {
      const element = document.getElementById(this.sectionId);
      this.module = module;
      if (element && module.init) await module.init(element);
      this.loaded = true;
      this.loading = null;
    });
    return this.loading;
  }
}
