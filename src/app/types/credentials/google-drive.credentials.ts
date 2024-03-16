import {Credentials} from "./credentials";

export interface PartialGoogleDriveCredentials extends Credentials {
  clientId: string;
  apiKey: string;
  directory: string;
}

export interface GoogleDriveCredentials extends PartialGoogleDriveCredentials {
  accessToken: string;
  expiresAt: Date;
}
