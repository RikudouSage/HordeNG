import {Injectable} from '@angular/core';
import {DatabaseService} from "./database.service";
import {CacheItem} from "../types/cache-item";

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  constructor(
    private readonly database: DatabaseService,
  ) {
  }

  public async getItem<T>(key: string): Promise<CacheItem<T>> {
    const raw = await this.database.getCacheItem<T>(key);
    if (raw === undefined) {
      return new CacheItem<T>(key);
    }

    if (raw.expires === undefined) {
      return new CacheItem<T>(key, true, raw.value);
    }

    const targetDate = new Date(raw.expires);
    const now = new Date();
    if (targetDate.getTime() < now.getTime()) {
      return new CacheItem<T>(key);
    }

    return new CacheItem<T>(key, true, raw.value, targetDate);
  }

  public async save<T>(cacheItem: CacheItem<T>): Promise<CacheItem<T>> {
    await this.database.saveCacheItem({
      key: cacheItem.key,
      value: cacheItem.value,
      expires: cacheItem.expires ? cacheItem.expires.toISOString() : undefined,
    });

    return await this.getItem(cacheItem.key);
  }

  public remove(key: string): Promise<void>;
  public remove(cacheItem: CacheItem<any>): Promise<void>;

  public async remove(keyOrCacheItem: string | CacheItem<any>): Promise<void> {
    if (keyOrCacheItem instanceof CacheItem) {
      keyOrCacheItem = keyOrCacheItem.key;
    }

    await this.database.removeCacheItem(keyOrCacheItem);
  }
}
