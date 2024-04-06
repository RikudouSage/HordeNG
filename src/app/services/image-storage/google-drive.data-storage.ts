import {GoogleDriveCredentials, PartialGoogleDriveCredentials} from "../../types/credentials/google-drive.credentials";
import {Resolvable} from "../../helper/resolvable";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DatabaseService} from "../database.service";
import {Injectable} from "@angular/core";
import {UploadFileResponse} from "../../types/google-drive/upload-file-response";
import {CacheService} from "../cache.service";
import {Sampler} from "../../types/horde/sampler";
import {PostProcessor} from "../../types/horde/post-processor";
import {AbstractExternalDataStorage} from "./abstract-external.data-storage";
import {GenerationOptions} from "../../types/db/generation-options";
import TokenResponse = google.accounts.oauth2.TokenResponse;

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveDataStorage extends AbstractExternalDataStorage<GoogleDriveCredentials> {
  private readonly DirectoryMimeType = 'application/vnd.google-apps.folder';
  private readonly CacheKeys = {
    PrefixDirectoryId: 'google_drive.prefix_directory.id',
    OptionsFileId: 'google_drive.options_file.id',
  };

  private initialized = false;
  private readonly scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
  ];
  private readonly discoveryDoc = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private credentialResolver: ((value: (PromiseLike<GoogleDriveCredentials> | GoogleDriveCredentials)) => void) | null = null;
  private credentialRejector: ((reason?: any) => void) | null = null;
  private partialCredentials: PartialGoogleDriveCredentials | null = null;

  constructor(
    protected readonly database: DatabaseService,
    protected readonly cache: CacheService,
  ) {
    super();
  }

  public get name(): string {
    return 'google_drive';
  }

  public get displayName(): Resolvable<string> {
    return 'Google Drive';
  }

  public async requestCredentials(credentials: PartialGoogleDriveCredentials): Promise<GoogleDriveCredentials> {
    await this.initializeClient(credentials);
    return new Promise<GoogleDriveCredentials>((resolve, reject) => {
      this.credentialResolver = resolve;
      this.credentialRejector = reject;
      this.partialCredentials = credentials;
      this.tokenClient!.requestAccessToken();
    });
  }

  public async getGapi(): Promise<typeof gapi.client> {
    const credentials = await this.getCredentials();
    if (credentials.expiresAt.getTime() < new Date().getTime()) {
      const newCredentials = await this.requestCredentials(credentials);
      await this.database.setSetting({
        setting: 'credentials',
        value: newCredentials,
      });
    }
    await this.initializeClient();
    return gapi.client;
  }

  public async validateCredentials(credentials: GoogleDriveCredentials): Promise<string | boolean> {
    return true;
  }

  protected override async doStoreImage(image: UnsavedStoredImage): Promise<void> {
    const result = await this.uploadFile({
      mime: 'image/webp',
      name: `${image.id!}.webp`,
      parents: [await this.getPrefixDirectoryId()],
      content: image.data,
    });

    const metadata: Record<(keyof Omit<GenerationOptions, 'worker' | 'data' | 'loraList' | 'onlyMyWorkers'>) | 'workerId' | 'workerName' | 'loras' | 'googleApiId', string> = {
      workerId: image.worker.id,
      workerName: image.worker.name,
      model: image.model,
      seed: image.seed,
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
      allowDowngrade: String(Number(image.allowDowngrade)),
      censorNsfw: String(Number(image.censorNsfw)),
      slowWorkers: String(Number(image.slowWorkers)),
      trustedWorkers: String(Number(image.trustedWorkers)),
      nsfw: String(Number(image.nsfw)),
      loras: JSON.stringify(image.loraList),
      googleApiId: result.id,
      clipSkip: String(image.clipSkip),
      styleName: String(image.styleName),
    };

    await this.storeOption(`image.metadata.${image.id}`, metadata);
  }

  protected override async getFreshImages(): Promise<StoredImage[]> {
    const gapi = await this.getGapi();
    let files: gapi.client.drive.File[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const response = (await gapi.drive.files.list({
        orderBy: 'createdTime desc',
        pageToken: nextPageToken,
      })).result;
      nextPageToken = <string|undefined>response.nextPageToken;
      files = [...files, ...(response.files ?? []).filter(file => file.name?.endsWith('.webp') ?? false)];
    } while (nextPageToken);

    const bodies = await Promise.all(files.map(
      file =>
        gapi.drive.files.get({
          fileId: file.id!,
          alt: 'media'
        })
          .then(response => response.body)
          .then(raw => raw.split('').map(char => char.charCodeAt(0)))
          .then(bytes => new Uint8Array(bytes))
          .then(bytes => new Blob([bytes], {type: 'image/webp'})),
    ));

    return await Promise.all(files.map(async (file, index): Promise<StoredImage> => {
      const id = file.name!.substring(0, file.name!.length - 5);
      const metadata = await this.getOption<Record<string, string>>(`image.metadata.${id}`);
      if (metadata === undefined) {
        throw new Error(`Image without metadata: ${file.name}`);
      }


      return {
        id: id,
        data: bodies[index],
        sampler: <Sampler|undefined>metadata['sampler'] ?? Sampler.lcm,
        seed: metadata['seed'],
        model: metadata['model'],
        faceFixerStrength: Number(metadata['faceFixerStrength']),
        postProcessors: <PostProcessor[]>metadata['postProcessors']?.split(',') ?? [],
        worker: {
          id: metadata['workerId'] ?? '',
          name: metadata['workerName'] ?? '',
        },
        karras: Boolean(Number(metadata['karras'] ?? 0)),
        steps: Number(metadata['steps'] ?? 0),
        height: Number(metadata['height'] ?? 0),
        width: Number(metadata['width'] ?? 0),
        hiresFix: Boolean(Number(metadata['hiresFix'] ?? 0)),
        denoisingStrength: Number(metadata['denoisingStrength'] ?? 0),
        cfgScale: Number(metadata['cfgScale'] ?? 0),
        prompt: metadata['prompt'] ?? '',
        negativePrompt: metadata['negativePrompt'],
        loraList: JSON.parse(metadata['loras'] || '[]'),
        censorNsfw: Boolean(Number(metadata['censorNsfw'] ?? 0)),
        slowWorkers: Boolean(Number(metadata['slowWorkers'] ?? 0)),
        trustedWorkers: Boolean(Number(metadata['trustedWorkers'] ?? 0)),
        nsfw: Boolean(Number(metadata['nsfw'] ?? 0)),
        allowDowngrade: Boolean(Number(metadata['allowDowngrade'] ?? 0)),
        clipSkip: Number(metadata['clipSkip'] ?? 0),
        styleName: metadata['styleName'] || null,
        onlyMyWorkers: false,
      }
    }));
  }

  protected override async doDeleteImage(image: StoredImage): Promise<void> {
    const metadata = await this.getOption<Record<string, string>>(`image.metadata.${image.id}`);
    const fileId = metadata!['googleApiId'];

    const client = await this.getGapi();
    await client.drive.files.delete({
      fileId: fileId,
    });
  }

  protected override async uploadOptions(options: Record<string, any>): Promise<void> {
    await this.uploadFile({
      mime: 'application/json',
      content: new Blob([JSON.stringify(options)], {type: 'application/json'}),
      id: await this.getOptionsFileId(),
    });
  }

  protected override async getFreshOptions(): Promise<Record<string, any>> {
    const gapi = await this.getGapi();
    const fileId = await this.getOptionsFileId();
    const file = await gapi.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return JSON.parse(file.body);
  }

  private async getOptionsFileId(): Promise<string> {
    const cacheItem = await this.cache.getItem<string>(this.CacheKeys.OptionsFileId);
    if (cacheItem.isHit) {
      return cacheItem.value!;
    }

    const gapi = await this.getGapi();
    let fileId = ((await gapi.drive.files.list({
      orderBy: 'createdTime',
    })).result.files ?? []).filter(file => file.name === 'options.json')[0]?.id;
    if (!fileId) {
      fileId = (await this.uploadFile({
        mime: 'application/json',
        content: new Blob(['{}'], {type: 'application/json'}),
        parents: [await this.getPrefixDirectoryId()],
        name: 'options.json',
      })).id;
    }

    cacheItem.value = fileId;
    await this.cache.save(cacheItem);

    return fileId;
  }

  private async uploadFile(options: {
    mime: string;
    name?: string;
    content: Blob;
    parents?: string[];
    id?: string;
  }): Promise<UploadFileResponse> {
    const credentials = await this.getCredentials();

    const metadata: gapi.client.drive.File = {
      mimeType: options.mime,
      name: options.name,
      parents: options.parents,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', options.content);

    const url = options.id
      ? `https://www.googleapis.com/upload/drive/v3/files/${options.id}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

    const response = await fetch(url, {
      method: options.id === undefined ? 'POST' : 'PATCH',
      headers: {Authorization: `Bearer ${credentials.accessToken}`},
      body: form,
    });

    return await response.json();
  }

  private async initializeClient(credentials?: PartialGoogleDriveCredentials): Promise<void> {
    if (this.initialized) {
      return;
    }
    credentials ??= await this.getCredentials();
    await new Promise<void>((resolve, reject) => gapi.load('client', {callback: resolve, onerror: reject}));
    await gapi.client.init({
      apiKey: credentials.apiKey,
      discoveryDocs: [this.discoveryDoc],
    });
    if ((<GoogleDriveCredentials>credentials).accessToken) {
      gapi.client.setToken({
        access_token: (<GoogleDriveCredentials>credentials).accessToken,
      });
    }
    await new Promise<void>((resolve, reject) => {
      try {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: credentials!.clientId,
          scope: this.scopes.join(' '),
          callback: this.onTokenResponseReceived.bind(this),
        });
        resolve();
      } catch (e) {
        console.error(e);
        reject();
      }
    });
    this.initialized = true;
  }

  private async getCredentials(): Promise<GoogleDriveCredentials> {
    const credentials = await this.database.getSetting<GoogleDriveCredentials>('credentials');
    if (!credentials) {
      throw new Error("Credentials not found");
    }

    return credentials.value;
  }

  private async onTokenResponseReceived(response: TokenResponse): Promise<void> {
    if (response.error) {
      if (this.credentialRejector) {
        this.credentialRejector([response.error, response.error_uri, response.error_description]);
        this.credentialRejector = null;
        this.credentialResolver = null;
        return;
      }
      throw new Error(`[${response.error}] ${response.error_description}: ${response.error_uri}`);
    }
    const partial = this.partialCredentials ?? await this.getCredentials();
    const credentials: GoogleDriveCredentials = {
      apiKey: partial.apiKey,
      clientId: partial.clientId,
      accessToken: response.access_token,
      expiresAt: new Date(new Date().getTime() + Number(response.expires_in) * 1_000),
      directory: partial.directory,
    };
    if (!this.credentialResolver) {
      await this.database.setSetting({
        setting: 'credentials',
        value: credentials,
      });
    } else {
      this.credentialResolver(credentials);
      this.credentialRejector = null;
      this.credentialResolver = null;
    }
  }

  protected override async doClearCache(): Promise<void> {
    const promises: Promise<any>[] = [];
    for (const value of Object.values(this.CacheKeys)) {
      promises.push(this.cache.remove(value));
    }

    await Promise.all(promises);
  }

  private async getPrefix(): Promise<string> {
    const credentials = await this.getCredentials();
    let prefix = credentials.directory;
    if (prefix && prefix.endsWith('/')) {
      prefix = prefix.substring(0, prefix.length - 1);
    }

    return prefix;
  }

  private async getPrefixDirectoryId(): Promise<string> {
    const cacheItem = await this.cache.getItem<string>(this.CacheKeys.PrefixDirectoryId);
    if (cacheItem.isHit) {
      return cacheItem.value!;
    }

    const gapi = await this.getGapi();
    const prefix = await this.getPrefix();
    const files = ((await gapi.drive.files.list({
      orderBy: 'createdTime',
    })).result.files ?? []);

    let directoryId: string;
    const directory = files.filter(file => file.mimeType === this.DirectoryMimeType && file.name === prefix)[0] ?? null;
    if (directory === null) {
      directoryId = (await gapi.drive.files.create({
        resource: {
          name: prefix,
          mimeType: this.DirectoryMimeType,
        },
      })).result.id!;
    } else {
      directoryId = directory.id!;
    }

    cacheItem.value = directoryId;
    await this.cache.save(cacheItem);

    return directoryId;
  }
}
