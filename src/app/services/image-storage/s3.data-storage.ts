import {DataStorage} from "./data-storage";
import {Injectable} from "@angular/core";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {Resolvable} from "../../helper/resolvable";
import {TranslatorService} from "../translator.service";
import {
  DeleteObjectCommand, GetBucketCorsCommand,
  GetObjectCommand,
  ListObjectsV2Command, ListObjectsV2CommandOutput,
  NoSuchKey, PutBucketCorsCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";
import {PaginatedResult} from "../../types/paginated-result";
import {Sampler} from "../../types/horde/sampler";
import {PostProcessor} from "../../types/horde/post-processor";
import _ from 'lodash';

export const S3CorsConfig = [
  {
    "AllowedHeaders": [
      "*",
    ],
    "AllowedMethods": [
      "PUT",
      "POST",
      "DELETE",
      "GET",
    ],
    "AllowedOrigins": [
      "*",
    ],
    "ExposeHeaders": [
      "x-amz-meta-cfgscale",
      "x-amz-meta-width",
      "x-amz-meta-workername",
      "x-amz-meta-postprocessors",
      "x-amz-meta-sampler",
      "x-amz-meta-steps",
      "x-amz-meta-seed",
      "x-amz-meta-workerid",
      "x-amz-meta-karras",
      "x-amz-meta-denoisingstrength",
      "x-amz-meta-prompt",
      "x-amz-meta-height",
      "x-amz-meta-model",
      "x-amz-meta-facefixerstrength",
      "x-amz-meta-hiresfix",
      "x-amz-meta-negativeprompt"
    ],
  },
];

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

  public async loadImages(page: number, perPage: number): Promise<PaginatedResult<StoredImage>> {
    const client = await this.getClient();
    const prefix = await this.getPrefix();
    const bucket = await this.getBucket();

    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }));
    const total = response.KeyCount!;
    const lastPage = Math.ceil(total / perPage);

    if (!response?.Contents) {
      return {
        page: page,
        lastPage: lastPage,
        rows: [],
      };
    }

    const keys = response.Contents
      .sort((a, b) => {
        if (a.LastModified!.getTime() === b.LastModified!.getTime()) {
          return 0;
        }

        return a.LastModified!.getTime() > b.LastModified!.getTime() ? -1 : 1;
      })
      .slice(0, perPage)
      .filter(object => object.Key!.endsWith('.webp'))
      .map(object => object.Key!)
    ;

    const images = await Promise.all(keys.map(key => {
      return client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
    }));
    const bodies = await Promise.all(images.map(
      image => image.Body!.transformToByteArray().then(body => new Blob([body])),
    ));

    return {
      page: page,
      lastPage: lastPage,
      rows: images.map((image, index): StoredImage => {
        const id = keys[index].substring(prefix.length + 1, keys[index].length - 5);
        return {
          id: id,
          data: bodies[index],
          sampler: <Sampler|undefined>image.Metadata!['sampler'] ?? Sampler.lcm,
          seed: image.Metadata!['seed'],
          model: image.Metadata!['model'],
          faceFixerStrength: Number(image.Metadata!['facefixerstrength']),
          postProcessors: <PostProcessor[]>image.Metadata!['postprocessors']?.split(',') ?? [],
          worker: {
            id: image.Metadata!['workerid'] ?? '',
            name: image.Metadata!['workername'] ?? '',
          },
          karras: Boolean(Number(image.Metadata!['karras'] ?? 0)),
          steps: Number(image.Metadata!['steps'] ?? 0),
          height: Number(image.Metadata!['height'] ?? 0),
          width: Number(image.Metadata!['width'] ?? 0),
          hiresFix: Boolean(Number(image.Metadata!['hiresfix'] ?? 0)),
          denoisingStrength: Number(image.Metadata!['denoisingstrength'] ?? 0),
          cfgScale: Number(image.Metadata!['cfgscale'] ?? 0),
          prompt: image.Metadata!['prompt'] ?? '',
          negativePrompt: image.Metadata!['negativeprompt'],
          loras: [],
          censorNsfw: false,
          slowWorkers: false,
          trustedWorkers: false,
          nsfw: false,
        }
      }),
    }
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
        faceFixerStrength: String(image.faceFixerStrength),
        hiresFix: String(Number(image.hiresFix)),
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

  public async checkCors(): Promise<boolean | null> {
    const client = await this.getClient();
    try {
      const result = await client.send(new GetBucketCorsCommand({
        Bucket: await this.getBucket(),
      }));
      for (const rule of result.CORSRules!) {
        if (!rule.AllowedHeaders?.includes('*')) {
          continue;
        }
        if (!_.isMatch(rule.AllowedMethods ?? {}, S3CorsConfig[0].AllowedMethods)) {
          continue;
        }
        if (!rule.AllowedOrigins?.includes('*') && !rule.AllowedOrigins?.includes(window.location.origin)) {
          continue;
        }
        if (!_.isMatch(rule.ExposeHeaders ?? {}, S3CorsConfig[0].ExposeHeaders)) {
          continue;
        }

        return true;
      }

      try {
        await client.send(new PutBucketCorsCommand({
          Bucket: await this.getBucket(),
          CORSConfiguration: {
            CORSRules: S3CorsConfig,
          },
        }));
        return true;
      } catch (e) {
        return false;
      }
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('NetworkError')) {
        return false;
      }

      return null;
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
