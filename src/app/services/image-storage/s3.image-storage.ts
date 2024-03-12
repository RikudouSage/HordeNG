import {ImageStorage} from "./image-storage";
import {Injectable} from "@angular/core";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {Resolvable} from "../../helper/resolvable";
import {TranslatorService} from "../translator.service";
import {ListObjectsV2Command, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";

@Injectable({
  providedIn: 'root',
})
export class S3ImageStorage implements ImageStorage<S3Credentials> {
  constructor(
    private readonly translator: TranslatorService,
    private readonly database: DatabaseService,
  ) {
  }

  public get displayName(): Resolvable<string> {
    return this.translator.get('app.storage.s3');
  }

  public get name(): string {
    return 's3';
  }

  public async storeImage(image: UnsavedStoredImage): Promise<void> {
    const client = await this.getClient();
    const credentials = await this.getCredentials();
    let prefix = credentials.prefix ?? '';
    if (prefix && prefix.endsWith('/')) {
      prefix = prefix.substring(0, prefix.length - 2);
    }

    await client.send(new PutObjectCommand({
      Bucket: credentials.bucket,
      Key: `${prefix}/${image.id}.webp`,
      Body: image.data,
      Metadata: {
        workerId: image.worker.id,
        workerName: image.worker.name,
        model: image.model,
        seed: image.seed,
        loras: image.loras.join(','),
        postProcessors: image.postProcessors.join(','),
        prompt: image.prompt,
        negativePrompt: image.negativePrompt ?? '',
        sampler: image.sampler,
        cfgScale: String(image.cfgScale),
        denoisingStrength: String(image.denoisingStrength),
        height: String(image.height),
        width: String(image.width),
        steps: String(image.steps),
        karras: String(Number(image.karras)),
      },
      ContentType: 'image/webp',
    }));
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

  private async getClient(): Promise<S3Client> {
    const credentials = await this.getCredentials();

    return new S3Client({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      region: credentials.region,
    });
  }

  private async getCredentials(): Promise<S3Credentials> {
    const credentials = await this.database.getSetting<S3Credentials>('credentials');
    if (!credentials) {
      throw new Error("Credentials not found");
    }

    return credentials.value;
  }
}
