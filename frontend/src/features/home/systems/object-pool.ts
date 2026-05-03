export class ObjectPool<T> {
  private active: Uint8Array;
  private limit: number;
  private readonly pool: T[];

  constructor(factory: () => T, size: number) {
    this.pool = Array.from({ length: size }, factory);
    this.active = new Uint8Array(size);
    this.limit = size;
  }

  acquire() {
    for (let index = 0; index < this.limit; index += 1) {
      if (!this.active[index]) {
        this.active[index] = 1;
        const obj = this.pool[index];
        if (!obj) return null;
        return { id: index, obj };
      }
    }
    return null;
  }

  release(id: number) {
    if (id >= 0 && id < this.active.length) this.active[id] = 0;
  }

  resize(size: number) {
    this.limit = Math.max(0, Math.min(size, this.pool.length));
    for (let index = this.limit; index < this.active.length; index += 1) {
      this.active[index] = 0;
    }
  }

  forEach(fn: (item: T, id: number) => void) {
    for (let index = 0; index < this.limit; index += 1) {
      if (this.active[index]) {
        const item = this.pool[index];
        if (item) fn(item, index);
      }
    }
  }
}
