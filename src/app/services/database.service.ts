import {Injectable} from '@angular/core';
import {JobInProgress} from "../types/db/job-in-progress";
import {GenerationOptions, LoraGenerationOption} from "../types/db/generation-options";
import {Sampler} from "../types/horde/sampler";
import {JobMetadata} from "../types/job-metadata";
import {AppSetting} from "../types/app-setting";
import {StoredImage, UnsavedStoredImage} from "../types/db/stored-image";
import {PostProcessor} from "../types/horde/post-processor";
import {PaginatedResult} from "../types/paginated-result";
import {Order} from "../types/order";
import {PartialCacheItem} from "../types/cache-item";

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private _database: IDBDatabase | null = null;

  private readonly ObjectStores = {
    JobsInProgress: 'jobs_in_progress',
    Images: 'images',
    GenerationOptions: 'generation_options',
    GenerationMetadata: 'generation_metadata',
    Settings: 'settings',
    Cache: 'cache',
  };

  public async getCacheItem<T>(key: string): Promise<PartialCacheItem<T> | undefined> {
    return this.getValue(this.ObjectStores.Cache, key);
  }

  public async saveCacheItem(cacheItem: PartialCacheItem<any>): Promise<void> {
    await this.setValue(this.ObjectStores.Cache, cacheItem);
  }

  public async removeCacheItem(key: string): Promise<void> {
    await this.removeItem(this.ObjectStores.Cache, key);
  }

  public async storeImage(image: UnsavedStoredImage): Promise<void> {
    await this.setValue(this.ObjectStores.Images, image);
  }

  public async deleteImage(image: StoredImage): Promise<void> {
    await this.removeItem(this.ObjectStores.Images, image.id);
  }

  public async getImages(page: number, limit: number, order: Order = Order.Asc): Promise<PaginatedResult<StoredImage>> {
    return this.getRows(this.ObjectStores.Images, page, limit, order);
  }

  public async getSetting<T>(setting: string): Promise<AppSetting<T> | undefined>;
  public async getSetting<T>(setting: string, defaultValue: T): Promise<AppSetting<T>>;
  public async getSetting<T>(setting: string, defaultValue: T | undefined = undefined): Promise<AppSetting<T> | undefined> {
    const value = await this.getValue<AppSetting<T>>(this.ObjectStores.Settings, setting);
    if (value === undefined && defaultValue !== undefined) {
      return {setting: setting, value: defaultValue};
    }

    return value;
  }

  public async setSetting<T>(setting: AppSetting<T>): Promise<void> {
    await this.setValue(this.ObjectStores.Settings, setting);
  }

  public getJobsInProgress(): Promise<JobInProgress[]> {
    return this.getAll(this.ObjectStores.JobsInProgress);
  }

  public async addInProgressJob(job: JobInProgress): Promise<void> {
    await this.setValue(this.ObjectStores.JobsInProgress, job);
  }

  public async deleteInProgressJob(job: JobInProgress): Promise<void> {
    await this.removeItem(this.ObjectStores.JobsInProgress, job.id);
  }

  public async storeGenerationOptions(options: GenerationOptions): Promise<void> {
    const promises: Promise<any>[] = [];
    for (const key of Object.keys(options)) {
      promises.push(this.setValue(this.ObjectStores.GenerationOptions, {option: key, value: options[<keyof typeof options>key]}));
    }
    await Promise.all(promises);
  }

  public async getGenerationOptions(): Promise<GenerationOptions> {
    const values = await this.getAll<{option: string; value: any}>(this.ObjectStores.GenerationOptions);
    const valuesMap: {[option: string]: any} = {};
    for (const value of values) {
      valuesMap[value.option] = value.value;
    }

    return {
      height: <number>valuesMap['height'] ?? 512,
      width: <number>valuesMap['width'] ?? 512,
      cfgScale: <number>valuesMap['cfgScale'] ?? 7,
      denoisingStrength: <number>valuesMap['denoisingStrength'] ?? 0.75,
      negativePrompt: <string|null>valuesMap['negativePrompt'] ?? null,
      prompt: <string>valuesMap['prompt'] ?? '',
      sampler: <Sampler>valuesMap['sampler'] ?? Sampler.k_dpmpp_sde,
      steps: <number>valuesMap['steps'] ?? 25,
      model: <string>valuesMap['model'] ?? 'AlbedoBase XL (SDXL)',
      karras: <boolean>valuesMap['karras'] ?? true,
      postProcessors: <PostProcessor[]>valuesMap['postProcessors'] ?? [],
      seed: <string>valuesMap['seed'] ?? null,
      hiresFix: <boolean>valuesMap['hiresFix'] ?? false,
      faceFixerStrength: <number>valuesMap['faceFixerStrength'] ?? 0.75,
      nsfw: <boolean>valuesMap['nsfw'] ?? false,
      trustedWorkers: <boolean>valuesMap['trustedWorkers'] ?? false,
      censorNsfw: <boolean>valuesMap['censorNsfw'] ?? false,
      slowWorkers: <boolean>valuesMap['slowWorkers'] ?? true,
      allowDowngrade: <boolean>valuesMap['allowDowngrade'] ?? false,
      clipSkip: <number>valuesMap['clipSkip'] ?? 1,
      loraList: <LoraGenerationOption[]>valuesMap['loraList'] ?? [],
    };
  }

  public async storeJobMetadata(metadata: JobMetadata): Promise<void> {
    await this.setValue(this.ObjectStores.GenerationMetadata, metadata);
  }

  public async getJobMetadata(job: JobInProgress): Promise<JobMetadata | undefined> {
    return this.getValue(this.ObjectStores.GenerationMetadata, job.id);
  }

  public async removeJobMetadata(metadata: JobMetadata): Promise<void> {
    await this.removeItem(this.ObjectStores.GenerationMetadata, metadata.requestId);
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request: IDBRequest<T[]> = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async getRows<T>(storeName: string, page: number, limit: number, order: Order): Promise<PaginatedResult<T>> {
    let skipped = false;
    const start = (page - 1) * limit;

    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    const count = await new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    return new Promise((resolve, reject) => {
      const result: T[] = [];
      const request = store.openCursor(null, order === Order.Asc ? 'next' : 'prev');

      request.onerror = () => reject(request.error);
      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (!skipped && start > 0 && cursor) {
          cursor.advance(start);
          skipped = true;
          return;
        }

        if (cursor) {
          result.push(cursor.value);

          if (result.length < limit) {
            cursor.continue();
          } else {
            resolve({page: page, lastPage: Math.ceil(count / limit), rows: result});
          }
        } else {
          resolve({page: page, lastPage: Math.ceil(count / limit), rows: result});
        }
      };
    });
  }

  private async getValue<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request: IDBRequest<T> = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async removeItem(storeName: string, key: string): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async setValue<T>(storeName: string, value: T, key: string | null = null): Promise<IDBValidKey> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(value, key ?? undefined);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private getDatabase(): Promise<IDBDatabase> {
    if (this._database !== null) {
      return Promise.resolve(this._database);
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("horde_ng", 2);
      request.onsuccess = () => {
        this._database = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = event => {
        const db = request.result;
        const targetVersion = event.newVersion;
        const currentVersion = event.oldVersion;

        if (targetVersion === null) {
          return;
        }

        for (let version = currentVersion; version < targetVersion; ++version) {
          switch (version) {
            case 0:
              db.createObjectStore(this.ObjectStores.JobsInProgress, {
                keyPath: 'id',
                autoIncrement: false,
              });
              db.createObjectStore(this.ObjectStores.Images, {
                keyPath: 'id',
                autoIncrement: true,
              });
              db.createObjectStore(this.ObjectStores.GenerationOptions, {
                keyPath: 'option',
                autoIncrement: false,
              });
              db.createObjectStore(this.ObjectStores.GenerationMetadata, {
                keyPath: 'requestId',
                autoIncrement: false,
              });
              db.createObjectStore(this.ObjectStores.Settings, {
                keyPath: 'setting',
                autoIncrement: false,
              });
              break;
            case 1:
              db.createObjectStore(this.ObjectStores.Cache, {
                keyPath: 'key',
                autoIncrement: false,
              });
              break;
          }
        }
      };
    });
  }
}
