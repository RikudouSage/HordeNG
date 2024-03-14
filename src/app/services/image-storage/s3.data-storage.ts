import {DataStorage} from "./data-storage";
import {Injectable} from "@angular/core";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {Resolvable} from "../../helper/resolvable";
import {TranslatorService} from "../translator.service";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";
import {PaginatedResult} from "../../types/paginated-result";

@Injectable({
  providedIn: 'root',
})
export class S3DataStorage implements DataStorage<S3Credentials> {
  constructor(
    private readonly translator: TranslatorService,
    private readonly database: DatabaseService,
  ) {
  }

  getOption<T>(option: string, defaultValue: T): Promise<T>;
  getOption<T>(option: string): Promise<T | undefined>;
  public async getOption<T>(option: string, defaultValue?: T): Promise<T | undefined> {
    const client = await this.getClient();
    try {
      const item = await client.send(new GetObjectCommand({
        Bucket: await this.getBucket(),
        Key: `${await this.getPrefix()}/options.json`,
      }));
      if (item.Body) {
        const data = JSON.parse(await item.Body.transformToString());
        return data[option] ?? defaultValue;
      }

      return defaultValue;
    } catch (e) {
      if (!(e instanceof NoSuchKey)) {
        throw e;
      }
      return defaultValue;
    }
  }

  public async storeOption(option: string, value: any): Promise<void> {
    const client = await this.getClient();
    let options: {[key: string]: any} = {};
    try {
      const item = await client.send(new GetObjectCommand({
        Bucket: await this.getBucket(),
        Key: `${await this.getPrefix()}/options.json`,
      }));
      if (item.Body) {
        options = JSON.parse(await item.Body.transformToString());
      }
    } catch (e) {
      if (!(e instanceof NoSuchKey)) {
        throw e;
      }
    }
    options[option] = value;

    await client.send(new PutObjectCommand({
      Bucket: await this.getBucket(),
      Key: `${await this.getPrefix()}/options.json`,
      Body: JSON.stringify(options),
      ContentType: "application/json",
    }));
  }

  public async deleteImage(image: StoredImage): Promise<void> {
    const client = await this.getClient();

    await client.send(new DeleteObjectCommand({
      Bucket: await this.getBucket(),
      Key: `${await this.getPrefix()}/${image.id}.webp`,
    }));
  }

  loadImages(page: number, perPage: number): Promise<PaginatedResult<StoredImage>> {
    throw new Error("Method not implemented.");
  }

  public get displayName(): Resolvable<string> {
    return this.translator.get('app.storage.s3');
  }

  public get name(): string {
    return 's3';
  }

  public async storeImage(image: UnsavedStoredImage): Promise<void> {
    const client = await this.getClient();

    await client.send(new PutObjectCommand({
      Bucket: await this.getBucket(),
      Key: `${await this.getPrefix()}/${image.id}.webp`,
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

  private async getPrefix(): Promise<string> {
    const credentials = await this.getCredentials();
    let prefix = credentials.prefix ?? '';
    if (prefix && prefix.endsWith('/')) {
      prefix = prefix.substring(0, prefix.length - 1);
    }

    return prefix;
  }

  private async getBucket(): Promise<string> {
    return (await this.getCredentials()).bucket;
  }
}
