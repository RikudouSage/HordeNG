import {ImageStorage} from "./image-storage";
import {Injectable} from "@angular/core";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {Resolvable} from "../../helper/resolvable";
import {TranslatorService} from "../translator.service";
import {ListObjectsV2Command, S3Client} from "@aws-sdk/client-s3";

@Injectable({
  providedIn: 'root',
})
export class S3ImageStorage implements ImageStorage<S3Credentials> {
  constructor(
    private readonly translator: TranslatorService,
  ) {
  }

  public get displayName(): Resolvable<string> {
    return this.translator.get('app.storage.s3');
  }

  public get name(): string {
    return 's3';
  }

  public async validateCredentials(credentials: S3Credentials): Promise<boolean | string> {
    const client = new S3Client({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      region: credentials.region,
    });
    try {
      await client.send(new ListObjectsV2Command({
        Bucket: credentials.bucket,
        Prefix: credentials.prefix ?? undefined,
      }));
      return true;
    } catch (e) {
      console.error(e);
      if (e instanceof Error) {
        return e.message;
      }
      if (typeof e === 'string') {
        return e;
      }

      return false;
    }
  }
}
