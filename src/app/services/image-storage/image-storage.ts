import {Credentials} from "../../types/credentials/credentials";
import {Resolvable} from "../../helper/resolvable";
import {UnsavedStoredImage} from "../../types/db/stored-image";

export interface ImageStorage<TCredentials extends Credentials> {
  get name(): string;
  get displayName(): Resolvable<string>;
  validateCredentials(credentials: TCredentials): Promise<boolean | string>;
  storeImage(image: UnsavedStoredImage): Promise<void>;
}
