import {AbstractExternalDataStorage} from "./abstract-external.data-storage";
import {DropboxCredentials} from "../../types/credentials/dropbox.credentials";
import {Resolvable, toPromise} from "../../helper/resolvable";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {CacheService} from "../cache.service";
import {DatabaseService} from "../database.service";
import {Injectable} from "@angular/core";
import {DropboxService} from "../dropbox.service";
import {DropboxUploadResponse} from "../../types/dropbox/dropbox-upload-response";
import {Sampler} from "../../types/horde/sampler";
import {PostProcessor} from "../../types/horde/post-processor";

type Metadata = Record<keyof Omit<StoredImage, 'data'>, string>;

@Injectable({
  providedIn: 'root',
})
export class DropboxDataStorage extends AbstractExternalDataStorage<DropboxCredentials> {

  constructor(
    private readonly dropbox: DropboxService,
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
  ) {
    super();
  }

  public override get name(): string {
    return 'dropbox';
  }

  public override get displayName(): Resolvable<string> {
    return 'Dropbox';
  }

  public override validateCredentials(credentials: DropboxCredentials): Promise<boolean> {
    return toPromise(this.dropbox.validateAccessToken(credentials.accessKey));
  }

  protected override async getFreshImages(): Promise<StoredImage[]> {
    try {
      const response = await toPromise(this.dropbox.listFolder('images'));
      const files = response.entries.filter(entry => entry[".tag"] === 'file');


      return await Promise.all(files.map(async (file): Promise<StoredImage> => {
        const id = file.name!.substring(0, file.name!.length - 5);
        const metadata = await this.getOption<Metadata>(`image.metadata.${id}`);
        if (metadata === undefined) {
          throw new Error(`Image without metadata: ${file.name}`);
        }

        return {
          id: id,
          data: await toPromise(this.dropbox.downloadFile(file.path_display, true)),
          sampler: <Sampler>metadata.sampler ?? Sampler.lcm,
          seed: metadata.seed,
          model: metadata.model,
          faceFixerStrength: Number(metadata.faceFixerStrength),
          postProcessors: <PostProcessor[]>metadata.postProcessors?.split(',') ?? [],
          worker: {
            id: metadata.worker?.split(',')[1] ?? '',
            name: metadata.worker?.split(',')[0] ?? '',
          },
          karras: Boolean(Number(metadata.karras ?? 0)),
          steps: Number(metadata.steps ?? 0),
          height: Number(metadata.height ?? 0),
          width: Number(metadata.width ?? 0),
          hiresFix: Boolean(Number(metadata.hiresFix ?? 0)),
          denoisingStrength: Number(metadata.denoisingStrength ?? 0),
          cfgScale: Number(metadata.cfgScale ?? 0),
          prompt: metadata.prompt ?? '',
          negativePrompt: metadata.negativePrompt || null,
          loraList: JSON.parse(metadata.loraList || '[]'),
          censorNsfw: Boolean(Number(metadata.censorNsfw ?? 0)),
          slowWorkers: Boolean(Number(metadata.slowWorkers ?? 0)),
          trustedWorkers: Boolean(Number(metadata.trustedWorkers ?? 0)),
          nsfw: Boolean(Number(metadata.nsfw ?? 0)),
          allowDowngrade: Boolean(Number(metadata.allowDowngrade ?? 0)),
          clipSkip: Number(metadata.clipSkip ?? 0),
        };
      }));
    } catch (e) {
      console.error(e)
      return [];
    }
  }

  protected override async getFreshOptions(): Promise<Record<string, any>> {
    try {
      return await toPromise(this.dropbox.downloadFile('options.json', false));
    } catch (e) {
      return {};
    }
  }

  protected override async doStoreImage(image: UnsavedStoredImage): Promise<void> {
    const metadata: Metadata = {
      prompt: image.prompt,
      negativePrompt: String(image.negativePrompt),
      loraList: JSON.stringify(image.loraList),
      postProcessors: image.postProcessors.join(','),
      clipSkip: String(image.clipSkip),
      nsfw: String(Number(image.nsfw)),
      allowDowngrade: String(Number(image.allowDowngrade)),
      slowWorkers: String(Number(image.slowWorkers)),
      censorNsfw: String(Number(image.censorNsfw)),
      trustedWorkers: String(Number(image.trustedWorkers)),
      steps: String(image.steps),
      karras: String(Number(image.karras)),
      faceFixerStrength: String(image.faceFixerStrength),
      hiresFix: String(Number(image.hiresFix)),
      seed: String(image.seed),
      model: image.model,
      sampler: image.sampler,
      cfgScale: String(image.cfgScale),
      denoisingStrength: String(image.denoisingStrength),
      height: String(image.height),
      width: String(image.width),
      id: image.id!,
      worker: `${image.worker.name},${image.worker.id}`,
    };
    await Promise.all([
      this.uploadFile(`images/${image.id}.webp`, image.data, metadata),
      this.storeOption(`image.metadata.${image.id}`, metadata),
    ]);
  }

  protected override async uploadOptions(options: Record<string, any>): Promise<void> {
    await this.uploadFile('options.json',new Blob([JSON.stringify(options)], {type: 'application/json'}));
  }

  protected override doDeleteImage(image: StoredImage): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected override async doClearCache(): Promise<void> {
  }

  private uploadFile(name: string, content: Blob, metadata?: Record<string, string>): Promise<DropboxUploadResponse> {
    return toPromise(this.dropbox.uploadFile(name, content));
  }
}
