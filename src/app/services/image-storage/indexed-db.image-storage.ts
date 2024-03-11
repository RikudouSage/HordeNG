import {ImageStorage} from "./image-storage";
import {Injectable} from "@angular/core";
import {Credentials} from "../../types/credentials/credentials";
import {TranslatorService} from "../translator.service";
import {Resolvable} from "../../helper/resolvable";

@Injectable({
  providedIn: 'root',
})
export class IndexedDbImageStorage implements ImageStorage<Credentials> {
  constructor(
    private readonly translator: TranslatorService,
  ) {
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
}
