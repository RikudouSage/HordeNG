import {DataStorage} from "./data-storage";
import {Credentials} from "../../types/credentials/credentials";
import {Resolvable} from "../../helper/resolvable";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {PaginatedResult} from "../../types/paginated-result";
import {CacheService} from "../cache.service";
import {GenerationOptions} from "../../types/db/generation-options";
import {DatabaseService} from "../database.service";

export abstract class AbstractExternalDataStorage<TCredentials extends Credentials> implements DataStorage<TCredentials> {
  protected get BaseCacheKeys() {
    return {
      Images: `${this.name}.images`,
      ImageSize: `${this.name}.image_size`,
      Options: `${this.name}.options`,
    };
  }

  abstract get name(): string;
  abstract get displayName(): Resolvable<string>;
  abstract validateCredentials(credentials: TCredentials): Promise<boolean | string>;

  protected abstract get cache(): CacheService;
  protected abstract get database(): DatabaseService;
  protected abstract getFreshImages(): Promise<StoredImage[]>;
  protected abstract getFreshOptions(): Promise<Record<string, any>>;
  protected abstract doStoreImage(image: UnsavedStoredImage): Promise<void>;
  protected abstract uploadOptions(options: Record<string, any>): Promise<void>;
  protected abstract doDeleteImage(image: StoredImage): Promise<void>;
  protected abstract doClearCache(): Promise<void>;

  getOption<T>(option: string, defaultValue: T, useCache: boolean): Promise<T>;
  getOption<T>(option: string, defaultValue: T): Promise<T>;
  getOption<T>(option: string): Promise<T | undefined>;
  public async getOption<T>(option: string, defaultValue?: T, useCache?: boolean): Promise<T | undefined> {
    useCache ??= true;

    const cacheItem = await this.cache.getItem<Record<string, any>>(this.BaseCacheKeys.Options);
    let options: Record<string, any> = {};
    if (cacheItem.isHit && useCache) {
      options = cacheItem.value!;
    } else {
      options = await this.getFreshOptions();
    }

    cacheItem.value = options;
    if (useCache) {
      await this.cache.save(cacheItem);
    }

    return options[option] ?? defaultValue;
  }

  public async loadImages(page: number, perPage: number): Promise<PaginatedResult<StoredImage>> {
    const cacheItem = await this.cache.getItem<StoredImage[]>(this.BaseCacheKeys.Images);
    let images: StoredImage[];
    if (cacheItem.isHit) {
      images = cacheItem.value!;
    } else {
      images = await this.getFreshImages();
      cacheItem.value = images;
      await this.cache.save(cacheItem);
    }

    const total = images.length;
    const lastPage = Math.ceil(total / perPage);

    return {
      page: page,
      lastPage: lastPage,
      rows: images.slice((page - 1) * perPage, page * perPage),
    };
  }

  public async getSize(): Promise<number | null> {
    const cacheItem = await this.cache.getItem<number>(this.BaseCacheKeys.ImageSize);
    if (cacheItem.isHit) {
      return cacheItem.value!;
    }
    let result = 0;
    const images = await this.loadImages(1, 1_000);
    for (const image of images.rows) {
      result += image.data.size;
    }
    cacheItem.value = result;
    await this.cache.save(cacheItem);

    return result;
  }

  public async storeImage(image: UnsavedStoredImage): Promise<void> {
    await this.doStoreImage(image);

    const cacheItem = await this.cache.getItem<StoredImage[]>(this.BaseCacheKeys.Images);
    cacheItem.value ??= [];
    cacheItem.value.unshift(<StoredImage>image);
    await this.cache.save(cacheItem);
    await this.updateSize(image.data.size);
  }

  protected async updateSize(size: number): Promise<void> {
    const cacheItem = await this.cache.getItem<number>(this.BaseCacheKeys.ImageSize);
    if (!cacheItem.isHit) {
      return;
    }

    cacheItem.value! += size;
    await this.cache.save(cacheItem);
  }

  public async storeOption(option: string, value: any): Promise<void> {
    let options: Record<string, any> = {};
    const cacheItem = await this.cache.getItem<Record<string, any>>(this.BaseCacheKeys.Options);
    if (cacheItem.isHit) {
      options = cacheItem.value!;
    } else {
      options = await this.getFreshOptions();
    }
    options[option] = value;

    await this.uploadOptions(options);

    cacheItem.value = options;
    await this.cache.save(cacheItem);
  }

  public async deleteImage(image: StoredImage): Promise<void> {
    await this.doDeleteImage(image);

    const cacheItem = await this.cache.getItem<StoredImage[]>(this.BaseCacheKeys.Images);
    cacheItem.value ??= [];
    cacheItem.value = cacheItem.value.filter(stored => stored.id !== image.id);
    await this.cache.save(cacheItem);
    await this.updateSize(-image.data.size);
  }

  public async clearCache() {
    const promises: Promise<any>[] = [];
    for (const value of Object.values(this.BaseCacheKeys)) {
      promises.push(this.cache.remove(value));
    }

    await Promise.all(promises);
    await this.doClearCache();
  }

  public async getGenerationOptions(): Promise<GenerationOptions> {
    return await this.getOption(
      'generation_options',
      await this.database.getGenerationOptions(),
      false,
    );
  }

  public async storeGenerationOptions(options: GenerationOptions): Promise<void> {
    await this.storeOption('generation_options', options);
  }
}
