export interface PartialCacheItem<T> {
  expires: string | undefined;
  value: T;
  key: string;
}

export class CacheItem<T> {
  constructor(
    public readonly key: string,
    public readonly isHit: boolean = false,
    public value: T | undefined = undefined,
    public expires: Date | undefined = undefined,
  ) {
  }

  public expiresAfter(seconds: number): void {
    const target = new Date();
    target.setTime(new Date().getTime() + seconds * 1_000);
    this.expires = target;
  }
}

