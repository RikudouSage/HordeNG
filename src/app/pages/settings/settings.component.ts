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
import {DataStorage} from "../../services/image-storage/data-storage";
import {S3Credentials} from "../../types/credentials/s3.credentials";
import {DatabaseService} from "../../services/database.service";
import {Credentials} from "../../types/credentials/credentials";
import {S3CorsConfig, S3DataStorage} from "../../services/image-storage/s3.data-storage";
import {CopyButtonComponent} from "../../components/copy-button/copy-button.component";

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
    CopyButtonComponent
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
    s3_accessKey: new FormControl<string>(''),
    s3_secretKey: new FormControl<string>(''),
    s3_bucket: new FormControl<string>(''),
    s3_region: new FormControl<string>(''),
    s3_prefix: new FormControl<string | null>(null),
  }, [
    AppValidators.requiredIf(
      group => group.controls['storage'].value === 's3',
      's3_accessKey',
      's3_secretKey',
      's3_bucket',
      's3_region',
    )
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
            });
            const storage = <S3DataStorage>(await this.storageManager.currentStorage);
            this.s3CorsCheckResult.set(await storage.checkCors());
            break;
        }
      }

      this.form.patchValue({
        storage: storage,
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

    await this.database.setSetting({
      setting: 'image_storage',
      value: this.form.controls.storage.value!,
    });
    await this.storeImageStorageSettings();

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
  }

  private async validateImageStorage(): Promise<boolean> {
    const id = this.form.controls.storage.value!;
    switch (id) {
      case 's3':
        return await this.validateS3Storage();
      default:
        return true;
    }
  }

  private async validateS3Storage(): Promise<boolean> {
    const storage = <S3DataStorage>(await this.storageManager.findByName(this.form.controls.storage.value!));
    const result = await storage.validateCredentials({
      accessKeyId: this.form.controls.s3_accessKey.value!,
      secretAccessKey: this.form.controls.s3_secretKey.value!,
      bucket: this.form.controls.s3_bucket.value!,
      prefix: this.form.controls.s3_prefix.value,
      region: this.form.controls.s3_region.value!,
    });
    if (typeof result === 'string') {
      await this.messageService.error(this.translator.get('app.error.aws_error', {error: result}));
      return false;
    }

    if (result) {
      this.s3CorsCheckResult.set(await storage.checkCors());
    }

    return result;
  }

  private async storeImageStorageSettings(): Promise<void> {
    const id = this.form.controls.storage.value!;
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
          },
        });
        break;
    }
  }
}
