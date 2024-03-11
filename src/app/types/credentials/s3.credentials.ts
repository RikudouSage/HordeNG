import {Credentials} from "./credentials";

export interface S3Credentials extends Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  prefix?: string | null;
}
