import {Injectable} from "@angular/core";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {Resolvable} from "../../helper/resolvable";
import {TranslatorService} from "../translator.service";
import {
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";
import {Sampler} from "../../types/horde/sampler";
import {PostProcessor} from "../../types/horde/post-processor";
import _ from 'lodash';
import {CacheService} from "../cache.service";
import {AbstractExternalDataStorage} from "./abstract-external.data-storage";
import {OutputFormat} from "../../types/output-format";
import {parseQrCodeFromRawValue} from "../../helper/qr-code-migration-helper";

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
      "x-amz-meta-negativeprompt",
      "x-amz-meta-allowdowngrade",
      "x-amz-meta-censornsfw",
      "x-amz-meta-slowworkers",
      "x-amz-meta-trustedworkers",
      "x-amz-meta-nsfw",
      "x-amz-meta-clipskip",
      "x-amz-meta-loras",
      "x-amz-meta-textualinversionlist",
      "x-amz-meta-stylename",
      "x-amz-meta-format",
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class S3DataStorage extends AbstractExternalDataStorage<S3Credentials> {
  private readonly CacheKeys = {
    CorsCheck: 's3.cors_check',
  };

  constructor(
    private readonly translator: TranslatorService,
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
  ) {
    super();
  }

  protected override async uploadOptions(options: Record<string, any>): Promise<void> {
    const client = await this.getClient();
    await client.send(new PutObjectCommand({
      Bucket: await this.getBucket(),
      Key: `${await this.getPrefix()}/options.json`,
      Body: JSON.stringify(options),
      ContentType: "application/json",
    }));
  }

  protected override async getFreshOptions(): Promise<Record<string, any>> {
    const client = await this.getClient();
    try {
      const item = await client.send(new GetObjectCommand({
        Bucket: await this.getBucket(),
        Key: `${await this.getPrefix()}/options.json`,
        IfNoneMatch: 'invalid',
      }));
      if (item.Body) {
        return JSON.parse(await item.Body.transformToString());
      }
    } catch (e) {
      if (!(e instanceof NoSuchKey)) {
        throw e;
      }
    }

    return {};
  }

  protected override async doDeleteImage(image: StoredImage): Promise<void> {
    const client = await this.getClient();

    await client.send(new DeleteObjectCommand({
      Bucket: await this.getBucket(),
      Key: `${await this.getPrefix()}/${image.id}.webp`,
    }));
  }

  protected override async getFreshImages(): Promise<StoredImage[]> {
    const client = await this.getClient();
    const prefix = await this.getPrefix();
    const bucket = await this.getBucket();

    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }));

    response.Contents ??= [];

    const keys = response.Contents
      .sort((a, b) => {
        if (a.LastModified!.getTime() === b.LastModified!.getTime()) {
          return 0;
        }

        return a.LastModified!.getTime() > b.LastModified!.getTime() ? -1 : 1;
      })
      .filter(object => object.Key!.endsWith('.webp'))
      .map(object => object.Key!)
    ;

    const imagesResult = await Promise.all(keys.map(key => {
      return client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
    }));
    const bodies = await Promise.all(imagesResult.map(
      image => image.Body!.transformToByteArray().then(body => new Blob([body])),
    ));

    return imagesResult.map((image, index): StoredImage => {
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
        prompt: this.isBase64encoded(image.Metadata!['prompt']) ? this.base64decode(image.Metadata!['prompt']) : image.Metadata!['prompt'],
        negativePrompt: this.isBase64encoded(image.Metadata!['negativeprompt'] ?? '') ? this.base64decode(image.Metadata!['negativeprompt'] ?? '') : (image.Metadata!['negativeprompt'] ?? ''),
        loraList: JSON.parse(image.Metadata!['loras'] ?? '[]'),
        textualInversionList: JSON.parse(image.Metadata!['textualinversionlist'] ?? '[]'),
        censorNsfw: Boolean(Number(image.Metadata!['censornsfw'] ?? 0)),
        slowWorkers: Boolean(Number(image.Metadata!['slowworkers'] ?? 0)),
        trustedWorkers: Boolean(Number(image.Metadata!['trustedworkers'] ?? 0)),
        nsfw: Boolean(Number(image.Metadata!['nsfw'] ?? 0)),
        allowDowngrade: Boolean(Number(image.Metadata!['allowdowngrade'] ?? 0)),
        clipSkip: Number(image.Metadata!['clipskip'] ?? 1),
        styleName: image.Metadata!['stylename'] || null,
        onlyMyWorkers: false,
        amount: 1,
        format: <OutputFormat>image.Metadata!['format'] || OutputFormat.Webp,
        qrCode: parseQrCodeFromRawValue(image.Metadata!['qrCode']),
        transparent: Boolean(Number(image.Metadata!['transparent'] ?? 0)),
      }
    });
  }

  public get displayName(): Resolvable<string> {
    return this.translator.get('app.storage.s3');
  }

  public get name(): string {
    return 's3';
  }

  protected override async doStoreImage(image: UnsavedStoredImage): Promise<void> {
    const client = await this.getClient();

    if (!image.id) {
      throw new Error("S3 storage requires providing IDs beforehand.");
    }

    const metadata: Record<(keyof Omit<UnsavedStoredImage, 'worker' | 'data' | 'loraList' | 'onlyMyWorkers' | 'amount' | 'id'>) | 'workerId' | 'workerName' | 'loras', string> = {
      workerId: image.worker.id,
      workerName: image.worker.name,
      model: image.model,
      seed: image.seed,
      loras: JSON.stringify(image.loraList),
      textualInversionList: JSON.stringify(image.textualInversionList),
      postProcessors: image.postProcessors.join(','),
      prompt: this.base64encode(image.prompt),
      negativePrompt: this.base64encode(image.negativePrompt ?? ''),
      sampler: image.sampler,
      cfgScale: String(image.cfgScale),
      denoisingStrength: String(image.denoisingStrength),
      height: String(image.height),
      width: String(image.width),
      steps: String(image.steps),
      karras: String(Number(image.karras)),
      faceFixerStrength: String(image.faceFixerStrength),
      hiresFix: String(Number(image.hiresFix)),
      allowDowngrade: String(Number(image.allowDowngrade)),
      censorNsfw: String(Number(image.censorNsfw)),
      slowWorkers: String(Number(image.slowWorkers)),
      trustedWorkers: String(Number(image.trustedWorkers)),
      nsfw: String(Number(image.nsfw)),
      clipSkip: String(image.clipSkip),
      styleName: String(image.styleName),
      format: image.format,
      qrCode: String(image.qrCode),
      transparent: String(Number(image.transparent)),
    }

    await client.send(new PutObjectCommand({
      Bucket: await this.getBucket(),
      Key: `${await this.getPrefix()}/${image.id}.webp`,
      Body: image.data,
      Metadata: metadata,
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
      endpoint: credentials.endpoint,
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

  public async checkCors(credentials?: S3Credentials): Promise<boolean | null> {
    const cacheItem = await this.cache.getItem<boolean | null>(this.CacheKeys.CorsCheck);
    if (cacheItem.isHit) {
      return cacheItem.value ?? null;
    }
    cacheItem.expiresAfter(60 * 60);

    const client = await this.getClient(credentials);
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

        cacheItem.value = true;
        await this.cache.save(cacheItem);
        return true;
      }

      try {
        await client.send(new PutBucketCorsCommand({
          Bucket: await this.getBucket(),
          CORSConfiguration: {
            CORSRules: S3CorsConfig,
          },
        }));

        cacheItem.value = true;
        await this.cache.save(cacheItem);
        return true;
      } catch (e) {

        cacheItem.value = false;
        await this.cache.save(cacheItem);
        return false;
      }
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('NetworkError')) {
        cacheItem.value = false;
        await this.cache.save(cacheItem);
        return false;
      }

      cacheItem.value = null;
      await this.cache.save(cacheItem);
      return null;
    }
  }

  private async getClient(credentials?: S3Credentials): Promise<S3Client> {
    credentials ??= await this.getCredentials();

    return new S3Client({
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      region: credentials.region,
      endpoint: credentials.endpoint,
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

  protected override async doClearCache() {
    const promises: Promise<any>[] = [];
    for (const value of Object.values(this.CacheKeys)) {
      promises.push(this.cache.remove(value));
    }

    await Promise.all(promises);
  }
}
