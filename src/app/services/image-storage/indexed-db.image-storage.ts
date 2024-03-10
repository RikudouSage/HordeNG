import {ImageStorage} from "./image-storage";
import {Injectable} from "@angular/core";
import {Credentials} from "../../types/credentials/credentials";

@Injectable({
  providedIn: 'root',
})
export class IndexedDbImageStorage implements ImageStorage<Credentials> {
  public async validateCredentials(credentials: Credentials): Promise<boolean> {
    return true;
  }
}
