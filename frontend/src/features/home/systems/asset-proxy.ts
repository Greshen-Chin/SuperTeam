type CacheEntry<T> = {
  accessCount: number;
  data: T;
  loadedAt: number;
  size: number;
};

class AssetProxyStore {
  private readonly cache = new Map<PropertyKey, CacheEntry<unknown>>();
  private readonly loading = new Map<PropertyKey, Promise<unknown>>();

  constructor() {
    return new Proxy(this, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") return value.bind(target);
        const cached = target.cache.get(prop);
        if (cached) {
          cached.accessCount += 1;
          return cached.data;
        }
        return value;
      },
      set(target, prop, value) {
        target.cache.set(prop, {
          accessCount: 0,
          data: value,
          loadedAt: Date.now(),
          size: target.estimateSize(value)
        });
        return true;
      }
    });
  }

  async load(key: string, loaderFn: () => Promise<unknown>, priority: "critical" | "low" | "normal" = "normal") {
    const cached = this.cache.get(key);
    if (cached) {
      cached.accessCount += 1;
      return cached.data;
    }

    const current = this.loading.get(key);
    if (current) return current;

    const promise = loaderFn().then((result) => {
      this.cache.set(key, {
        accessCount: priority === "critical" ? 1 : 0,
        data: result,
        loadedAt: Date.now(),
        size: this.estimateSize(result)
      });
      this.loading.delete(key);
      return result;
    });
    this.loading.set(key, promise);
    return promise;
  }

  preload(key: string, loaderFn: () => Promise<unknown>) {
    void this.load(key, loaderFn, "low").catch(() => undefined);
  }

  evict(key: string) {
    this.cache.delete(key);
  }

  get stats() {
    return {
      cached: this.cache.size,
      loading: this.loading.size,
      totalSize: [...this.cache.values()].reduce((sum, value) => sum + value.size, 0)
    };
  }

  private estimateSize(data: unknown) {
    if (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) return data.width * data.height * 4;
    if (typeof data === "string") return data.length * 2;
    return 1000;
  }
}

export const assets = new AssetProxyStore();
