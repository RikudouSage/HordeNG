import {Inject, Injectable} from '@angular/core';
import {ImageStorage} from "./image-storage/image-storage";
import {Credentials} from "../types/credentials/credentials";
import {IMAGE_STORAGE} from "../app.config";
import {DatabaseService} from "./database.service";

@Injectable({
  providedIn: 'root'
})
export class ImageStorageManagerService {
  constructor(
    @Inject(IMAGE_STORAGE)
    private readonly storages: ImageStorage<Credentials>[],
    private readonly database: DatabaseService,
  ) {}

  public get currentStorage(): Promise<ImageStorage<Credentials>> {
    return new Promise<ImageStorage<Credentials>>((resolve, reject) => {
      this.database.getSetting<string>('image_storage').then(setting => {
        setting ??= {
          setting: 'image_storage',
          value: 'indexed_db',
        };
        this.findByName(setting.value)
          .then(storage => resolve(storage))
          .catch(error => reject(error));
      });
    });
  }

  public get allStorages(): ImageStorage<Credentials>[] {
    return this.storages;
  }

  public async findByName(name: string): Promise<ImageStorage<Credentials>> {
    for (const storage of this.storages) {
      if (storage.name === name) {
        return storage;
      }
    }

    throw new Error(`Unknown storage name: ${name}`);
  }
}
