import { Injectable } from '@angular/core';
import {JobInProgress} from "../types/db/job-in-progress";

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private _database: IDBDatabase | null = null;

  private readonly ObjectStores = {
    JobsInProgress: 'jobs_in_progress',
    Images: 'images',
  };

  public getJobsInProgress(): Promise<JobInProgress[]> {
    return this.getAll(this.ObjectStores.JobsInProgress);
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

  private async getValue<T>(storeName: string, key: string): Promise<T> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request: IDBRequest<T> = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async setValue<T>(storeName: string, value: T, key: string | null = null): Promise<IDBValidKey> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.add(value, key ?? undefined);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private getDatabase(): Promise<IDBDatabase> {
    if (this._database !== null) {
      return Promise.resolve(this._database);
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("horde_ng", 1);
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
              break;
          }
        }
      };
    });
  }
}
