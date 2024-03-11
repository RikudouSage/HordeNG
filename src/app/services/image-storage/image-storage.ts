import {Credentials} from "../../types/credentials/credentials";
import {Resolvable} from "../../helper/resolvable";

export interface ImageStorage<TCredentials extends Credentials> {
  get name(): string;
  get displayName(): Resolvable<string>;
  validateCredentials(credentials: TCredentials): Promise<boolean | string>;
}
