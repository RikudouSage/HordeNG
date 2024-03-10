import {Credentials} from "../../types/credentials/credentials";

export interface ImageStorage<TCredentials extends Credentials> {
  validateCredentials(credentials: TCredentials): Promise<boolean>;
}
