import {DataStorage} from "./data-storage";
import {Injectable} from "@angular/core";
import {Credentials} from "../../types/credentials/credentials";
import {TranslatorService} from "../translator.service";
import {Resolvable} from "../../helper/resolvable";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";
import {Order} from "../../types/order";
import {CacheService} from "../cache.service";
import {GenerationOptions} from "../../types/db/generation-options";
import {ImageLoader} from "../../helper/image-loader";
import {Observable, of} from "rxjs";
import {ProgressUpdater} from "../../helper/progress-updater";

@Injectable({
  providedIn: 'root',
})
export class IndexedDbDataStorage implements DataStorage<Credentials> {
  constructor(
    private readonly translator: TranslatorService,
    private readonly database: DatabaseService,
    private readonly cache: CacheService,
  ) {
  }

  public async getSize(): Promise<number> {
    const cacheItem = await this.cache.getItem<number>('indexed_db.image_size');
    if (cacheItem.isHit) {
      return cacheItem.value!;
    }
    let result = 0;
    const images = await this.loadImages(1, 100_000).result;
    for (const image of images.rows) {
      result += image.data.size;
    }
    cacheItem.value = result;
    await this.cache.save(cacheItem);

    return result;
  }

  public getOption<T>(option: string, defaultValue: T): Promise<T>;
  public getOption<T>(option: string): Promise<T | undefined>;
  public async getOption<T>(option: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this.database.getSetting<T>(option);
    if (value === undefined) {
      return defaultValue;
    }

    return value.value;
  }

  public async storeOption(option: string, value: any): Promise<void> {
    return await this.database.setSetting({
      setting: option,
      value: value,
    });
  }

  public async deleteImage(image: StoredImage): Promise<void> {
    await this.database.deleteImage(image);
  }

  public loadImages(page: number, perPage: number): ImageLoader {
    const updater: Observable<ProgressUpdater> = of({loaded: null, total: null});
    return {
      isLocal: true,
      result: this.database.getImages(page, perPage, Order.Desc).then(result => {
        return result;
      }),
      progressUpdater: updater,
    };
  }

  public get displayName(): Resolvable<string> {
    return this.translator.get('app.storage.browser');
  }

  public get name(): string {
    return 'indexed_db';
  }

  public async validateCredentials(credentials: Credentials): Promise<true> {
    return true;
  }

  public async storeImage(image: UnsavedStoredImage): Promise<StoredImage> {
    delete image.id;
    const id = await this.database.storeImage(image);
    return (await this.database.getImage(String(id)))!;
  }

  public async storeImagesInCache(...image: StoredImage[]): Promise<void> {
    // ignored, nothing to do
  }

  public async getGenerationOptions(): Promise<GenerationOptions> {
    return await this.database.getGenerationOptions();
  }

  public async storeGenerationOptions(options: GenerationOptions): Promise<void> {
    await this.database.storeGenerationOptions(options);
  }
}
