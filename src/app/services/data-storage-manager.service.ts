import {Inject, Injectable} from '@angular/core';
import {DataStorage} from "./image-storage/data-storage";
import {Credentials} from "../types/credentials/credentials";
import {DATA_STORAGE} from "../app.config";
import {DatabaseService} from "./database.service";

@Injectable({
  providedIn: 'root'
})
export class DataStorageManagerService {
  constructor(
    @Inject(DATA_STORAGE)
    private readonly storages: DataStorage<Credentials>[],
    private readonly database: DatabaseService,
  ) {}

  public get currentStorage(): Promise<DataStorage<Credentials>> {
    return new Promise<DataStorage<Credentials>>((resolve, reject) => {
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

  public get allStorages(): DataStorage<Credentials>[] {
    return this.storages;
  }

  public async findByName(name: string): Promise<DataStorage<Credentials>> {
    for (const storage of this.storages) {
      if (storage.name === name) {
        return storage;
      }
    }

    throw new Error(`Unknown storage name: ${name}`);
  }
}
