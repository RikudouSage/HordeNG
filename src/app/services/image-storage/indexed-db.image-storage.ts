import {ImageStorage} from "./image-storage";
import {Injectable} from "@angular/core";
import {Credentials} from "../../types/credentials/credentials";
import {TranslatorService} from "../translator.service";
import {Resolvable} from "../../helper/resolvable";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";
import {PaginatedResult} from "../../types/paginated-result";

@Injectable({
  providedIn: 'root',
})
export class IndexedDbImageStorage implements ImageStorage<Credentials> {
  constructor(
    private readonly translator: TranslatorService,
    private readonly database: DatabaseService,
  ) {
  }

  public loadImages(page: number, perPage: number): Promise<PaginatedResult<StoredImage>> {
    return this.database.getImages(page, perPage);
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

  public async storeImage(image: UnsavedStoredImage): Promise<void> {
    delete image.id;
    await this.database.storeImage(image);
  }
}
