import {Component, Inject, OnInit, PLATFORM_ID, Signal, signal, WritableSignal} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AuthManagerService} from "../../services/auth-manager.service";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {LoaderComponent} from "../../components/loader/loader.component";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {DataStorageManagerService} from "../../services/data-storage-manager.service";
import {isPlatformBrowser, JsonPipe, KeyValuePipe} from "@angular/common";
import {AppValidators} from "../../helper/app-validators";
import {
  ToggleablePasswordInputComponent
} from "../../components/toggleable-password-input/toggleable-password-input.component";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {DatabaseService} from "../../services/database.service";
import {Credentials} from "../../types/credentials/credentials";
import {S3CorsConfig, S3DataStorage} from "../../services/image-storage/s3.data-storage";
import {CopyButtonComponent} from "../../components/copy-button/copy-button.component";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {GoogleDriveDataStorage} from "../../services/image-storage/google-drive.data-storage";
import {GoogleDriveCredentials} from "../../types/credentials/google-drive.credentials";
import {DropboxCredentials} from "../../types/credentials/dropbox.credentials";
import {DropboxDataStorage} from "../../services/image-storage/dropbox.data-storage";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule,
    FaIconComponent,
    LoaderComponent,
    KeyValuePipe,
    ToggleablePasswordInputComponent,
    JsonPipe,
    CopyButtonComponent,
    TranslocoMarkupComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  private readonly isBrowser: boolean;

  public storageNames: WritableSignal<{[key: string]: string}> = signal({});
  public loading = signal(true);

  public s3CorsCheckResult = signal<undefined|null|boolean>(undefined);
  public s3CorsConfig: Signal<any> = signal(S3CorsConfig);

  public form = new FormGroup({
    apiKey: new FormControl<string>(this.authManager.anonymousApiKey, [
      Validators.required,
    ]),
    storage: new FormControl<string>('indexed_db', [
      Validators.required,
    ]),
    homepage: new FormControl<string>('about', [
      Validators.required,
    ]),
    s3_accessKey: new FormControl<string>(''),
    s3_secretKey: new FormControl<string>(''),
    s3_bucket: new FormControl<string>(''),
    s3_region: new FormControl<string>(''),
    s3_prefix: new FormControl<string | null>(null),
    s3_endpoint: new FormControl<string | null>(null),
    google_drive_client_id: new FormControl<string>(''),
    google_drive_api_key: new FormControl<string>(''),
    google_drive_access_key: new FormControl<string>(''),
    google_drive_expires_at: new FormControl<Date | null>(null),
    google_drive_directory: new FormControl<string>(''),
    dropbox_accessKey: new FormControl<string>(''),
  }, [
    AppValidators.requiredIf(
      group => group.controls['storage'].value === 's3',
      's3_accessKey',
      's3_secretKey',
      's3_bucket',
      's3_region',
    ),
    AppValidators.requiredIf(
      group => group.controls['storage'].value === 'google_drive',
      'google_drive_client_id',
      'google_drive_api_key',
      'google_drive_access_key',
      'google_drive_expires_at',
      'google_drive_directory',
    ),
    AppValidators.requiredIf(
      group => group.controls['storage'].value === 'dropbox',
      'dropbox_accessKey',
    ),
  ]);

  constructor(
    private readonly authManager: AuthManagerService,
    private readonly horde: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    private readonly storageManager: DataStorageManagerService,
    private readonly database: DatabaseService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    this.form.patchValue({
      apiKey: this.authManager.apiKey(),
    });

    if (this.isBrowser) {
      const storage = (await this.database.getSetting('image_storage', 'indexed_db'))!.value;
      // const gapi = await (<GoogleDriveDataStorage>(await this.storageManager.currentStorage)).getGapi();
      const credentials = await this.database.getSetting<Credentials>('credentials');
      if (credentials !== undefined) {
        switch (storage) {
          case 's3':
            this.form.patchValue({
              s3_region: (<S3Credentials>credentials.value).region,
              s3_bucket: (<S3Credentials>credentials.value).bucket,
              s3_prefix: (<S3Credentials>credentials.value).prefix,
              s3_secretKey: (<S3Credentials>credentials.value).secretAccessKey,
              s3_accessKey: (<S3Credentials>credentials.value).accessKeyId,
              s3_endpoint: (<S3Credentials>credentials.value).endpoint,
            });
            const storage = <S3DataStorage>(await this.storageManager.currentStorage);
            this.s3CorsCheckResult.set(await storage.checkCors());
            break;
          case 'google_drive':
            this.form.patchValue({
              google_drive_client_id: (<GoogleDriveCredentials>credentials.value).clientId,
              google_drive_access_key: (<GoogleDriveCredentials>credentials.value).accessToken,
              google_drive_expires_at: (<GoogleDriveCredentials>credentials.value).expiresAt,
              google_drive_api_key: (<GoogleDriveCredentials>credentials.value).apiKey,
              google_drive_directory: (<GoogleDriveCredentials>credentials.value).directory,
            });
            break;
          case 'dropbox':
            this.form.patchValue({
              dropbox_accessKey: (<DropboxCredentials>credentials.value).accessKey,
            });
            break;
        }
      }

      this.form.patchValue({
        storage: storage,
        homepage: (await this.database.getSetting('homepage', 'about')).value,
      });

      const storages: {[key: string]: string} = {};
      for (const storage of this.storageManager.allStorages) {
        storages[storage.name] = await toPromise(storage.displayName);
      }
      this.storageNames.set(storages);
    }

    this.loading.set(false);
  }

  public async submitForm(): Promise<void> {
    if (!this.form.valid) {
      await this.messageService.error(this.translator.get('app.error.form_invalid'));
      return;
    }
    this.loading.set(true);
    if (!await this.validateImageStorage()) {
      this.loading.set(false);
      return;
    }

    await Promise.all([
      this.database.setSetting({
        setting: 'image_storage',
        value: this.form.controls.storage.value!,
      }),
      this.database.setSetting({
        setting: 'homepage',
        value: this.form.controls.homepage.value!,
      }),
      this.storeImageStorageSettings(),
    ]);

    const previous = this.authManager.apiKey();
    this.authManager.apiKey = this.form.controls.apiKey.value!;
    const response = await toPromise(this.horde.currentUser());
    if (!response.success) {
      this.authManager.apiKey = previous;
      await this.messageService.error(this.translator.get('app.error.invalid_api_key'));
    } else {
      await this.messageService.success(this.translator.get('app.success.settings_form'));
    }

    this.loading.set(false);
    const storage = await this.storageManager.currentStorage;
    if (storage instanceof S3DataStorage) {
      await storage.checkCors();
    }
  }

  private async validateImageStorage(): Promise<boolean> {
    const id = this.form.controls.storage.value!;
    switch (id) {
      case 's3':
        return await this.validateS3Storage();
      case 'dropbox':
        const storage = <DropboxDataStorage>(await this.storageManager.findByName(this.form.controls.storage.value!));
        return await storage.validateCredentials({accessKey: this.form.value.dropbox_accessKey!});
      default:
        return true;
    }
  }

  private async validateS3Storage(): Promise<boolean> {
    const credentials: S3Credentials = {
      accessKeyId: this.form.controls.s3_accessKey.value!,
      secretAccessKey: this.form.controls.s3_secretKey.value!,
      bucket: this.form.controls.s3_bucket.value!,
      prefix: this.form.controls.s3_prefix.value,
      region: this.form.controls.s3_region.value!,
      endpoint: this.form.controls.s3_endpoint.value || undefined,
    };
    const storage = <S3DataStorage>(await this.storageManager.findByName(this.form.controls.storage.value!));
    await storage.clearCache();
    const result = await storage.validateCredentials(credentials);
    if (typeof result === 'string') {
      await this.messageService.error(this.translator.get('app.error.aws_error', {error: result}));
      return false;
    }

    return result;
  }

  private async storeImageStorageSettings(): Promise<void> {
    const id = this.form.controls.storage.value!;
    const storage = await this.storageManager.currentStorage;
    switch (id) {
      case 's3':
        await this.database.setSetting<S3Credentials>({
          setting: 'credentials',
          value: {
            accessKeyId: this.form.controls.s3_accessKey.value!,
            secretAccessKey: this.form.controls.s3_secretKey.value!,
            bucket: this.form.controls.s3_bucket.value!,
            prefix: this.form.controls.s3_prefix.value,
            region: this.form.controls.s3_region.value!,
            endpoint: this.form.controls.s3_endpoint.value || undefined,
          },
        });
        await (<S3DataStorage>storage).clearCache();
        break;
      case 'google_drive':
        await this.database.setSetting<GoogleDriveCredentials>({
          setting: 'credentials',
          value: {
            clientId: this.form.value.google_drive_client_id!,
            expiresAt: this.form.value.google_drive_expires_at!,
            apiKey: this.form.value.google_drive_api_key!,
            accessToken: this.form.value.google_drive_access_key!,
            directory: this.form.value.google_drive_directory!,
          },
        });
        await (<GoogleDriveDataStorage>storage).clearCache();
        break;
      case 'dropbox':
        await this.database.setSetting<DropboxCredentials>({
          setting: 'credentials',
          value: {
            accessKey: this.form.value.dropbox_accessKey!,
          },
        });
        await (<DropboxDataStorage>storage).clearCache();
        break;
    }
  }

  public async authorizeInGoogle() {
    const storage = <GoogleDriveDataStorage>(await this.storageManager.findByName('google_drive'));
    const credentials = await storage.requestCredentials({
      clientId: this.form.value.google_drive_client_id!,
      apiKey: this.form.value.google_drive_api_key!,
      directory: this.form.value.google_drive_directory!,
    });
    this.form.patchValue({
      google_drive_api_key: credentials.apiKey,
      google_drive_client_id: credentials.clientId,
      google_drive_access_key: credentials.accessToken,
      google_drive_expires_at: credentials.expiresAt,
    });
  }
}
