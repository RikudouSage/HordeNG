import {
  Component,
  computed,
  Inject,
  OnInit,
  PLATFORM_ID,
  Signal,
  signal,
  TemplateRef,
  WritableSignal
} from '@angular/core';
import {LoaderComponent} from "../../components/loader/loader.component";
import {AiHorde} from "../../services/ai-horde.service";
import {UserDetails} from "../../types/horde/user-details";
import {toPromise} from "../../helper/resolvable";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {TranslocoPipe} from "@ngneat/transloco";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {SmallBoxComponent} from "../../components/small-box/small-box.component";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {BoxComponent} from "../../components/box/box.component";
import {AsyncPipe, isPlatformBrowser} from "@angular/common";
import {interval} from "rxjs";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {WorkerType} from "../../types/horde/worker-type";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AppValidators} from "../../helper/app-validators";
import {AuthManagerService} from "../../services/auth-manager.service";
import {SharedKey} from "../../types/horde/shared-key";
import {CopyButtonComponent} from "../../components/copy-button/copy-button.component";
import {ModalService} from "../../services/modal.service";
import {FormatDatetimePipe} from "../../pipes/format-date.pipe";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {CurrentUserStatusComponent} from "../../components/horde/current-user-status/current-user-status.component";
import {HordeStatusComponent} from "../../components/horde/horde-status/horde-status.component";
import {WorkerDetailComponent} from "../../components/worker-detail/worker-detail.component";
import {YourWorkersComponent} from "../../components/horde/your-workers/your-workers.component";
import {TransferKudosComponent} from "../../components/horde/transfer-kudos/transfer-kudos.component";

@Component({
  selector: 'app-horde',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    TranslocoMarkupComponent,
    SmallBoxComponent,
    FormatNumberPipe,
    BoxComponent,
    YesNoComponent,
    PrintSecondsPipe,
    AsyncPipe,
    MathSqrtPipe,
    ReactiveFormsModule,
    CopyButtonComponent,
    FormatDatetimePipe,
    FaIconComponent,
    CurrentUserStatusComponent,
    HordeStatusComponent,
    WorkerDetailComponent,
    YourWorkersComponent,
    TransferKudosComponent
  ],
  templateUrl: './horde.component.html',
  styleUrl: './horde.component.scss'
})
export class HordeComponent implements OnInit {
  private readonly isBrowser: boolean;
  protected readonly WorkerType = WorkerType;

  public loading = signal(true);

  public currentUser: WritableSignal<UserDetails | null> = signal(null);

  public isAnonymous = this.authManager.isAnonymous;
  public isSharedKey = computed(() => {
    if (this.isAnonymous()) {
      return false;
    }
    if (this.currentUser() === null) {
      return false;
    }
    return this.currentUser()!.username.toLowerCase().includes('shared key:');
  });
  public sharedKeys = computed(() => this.currentUser()?.sharedkey_ids ?? []);
  public sharedKeyDetails = signal<SharedKey[]>([]);

  public removeIcon: Signal<IconDefinition> = signal(faTrash);

  public createSharedKeyForm = new FormGroup({
    kudosLimit: new FormControl<number>(5_000, [
      Validators.min(-1),
      Validators.max(50_000_000),
      AppValidators.notEqualTo(0),
      Validators.required,
    ]),
    expiry: new FormControl<number>(-1, [
      Validators.min(-1),
      AppValidators.notEqualTo(0),
      Validators.required,
    ]),
    name: new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(255),
      Validators.minLength(3),
    ]),
    maxImagePixels: new FormControl<number>(-1, [
      Validators.required,
      Validators.min(-1),
      AppValidators.notEqualTo(0),
      Validators.max(4_194_304),
      AppValidators.or(
        AppValidators.equalTo(-1),
        AppValidators.divisibleBy(64),
      ),
    ]),
    maxImageSteps: new FormControl<number>(-1, [
      Validators.required,
      Validators.min(-1),
      AppValidators.notEqualTo(0),
      Validators.max(500),
    ]),
    maxTextTokens: new FormControl<number>(-1, [
      Validators.required,
      Validators.min(-1),
      AppValidators.notEqualTo(0),
      Validators.max(500),
    ]),
  });

  constructor(
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    private readonly authManager: AuthManagerService,
    private readonly modalService: ModalService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    await this.loadData();
    this.createSharedKeyForm.controls.maxImagePixels.valueChanges.subscribe(value => {
      if (value === null) {
        return;
      }

      if (value < -1) {
        this.createSharedKeyForm.patchValue({maxImagePixels: -1});
      }
    });
    if (this.isBrowser) {
      interval(60_000).subscribe(() => {
        this.loadData();
      });
      this.fetchSharedKeyDetails();
    }
  }

  private fetchSharedKeyDetails(): void {
    this.api.getSharedKeys(this.sharedKeys()).subscribe(response => {
      this.sharedKeyDetails.set(response.successResponse!);
      this.currentUser.update(value => {
        if (value === null) {
          return null;
        }

        value.sharedkey_ids = response.successResponse!.map(key => key.id);
        return {...value};
      });
    });
  }

  private async loadData(): Promise<void> {
    await this.refreshCurrentUser();
    this.fetchSharedKeyDetails();

    this.loading.set(false);
  }

  public async openModal(createKeyModal: TemplateRef<any>): Promise<void> {
    this.modalService.open(createKeyModal);
  }

  public async createSharedKey(): Promise<void> {
    if (!this.createSharedKeyForm.valid) {
      await this.messageService.error(this.translator.get('app.error.form_invalid'));
      return;
    }
    await this.modalService.close();

    const form = this.createSharedKeyForm.value;
    this.loading.set(true);
    const response = await toPromise(this.api.createSharedKey({
      name: form.name!,
      expiry: form.expiry!,
      kudos: form.kudosLimit!,
      max_image_pixels: form.maxImagePixels!,
      max_image_steps: form.maxImageSteps!,
      max_text_tokens: form.maxTextTokens!,
    }));
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      this.loading.set(false);
      return;
    }

    await this.messageService.success(this.translator.get('app.shared_key.create.success'));
    this.currentUser.update(currentUser => {
      if (currentUser === null) {
        return null;
      }

      currentUser.sharedkey_ids.push(response.successResponse!.id);
      return currentUser;
    });
    this.fetchSharedKeyDetails();
    this.loading.set(false);
  }

  public async removeSharedKey(sharedKey: SharedKey): Promise<void> {
    this.loading.set(true);
    const response = await toPromise(this.api.removeSharedKey(sharedKey));
    if (response.success) {
      await this.messageService.success(this.translator.get('app.success.shared_key.remove'));
      this.currentUser.update(value => {
        if (value === null) {
          return null;
        }

        value.sharedkey_ids = value.sharedkey_ids.filter(item => item !== sharedKey.id);
        return {...value};
      });
      this.sharedKeyDetails.update(value => value.filter(key => key.id !== sharedKey.id));
    } else {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
    }
    this.loading.set(false);
  }

  public async refreshCurrentUser() {
    const response = await toPromise(this.api.currentUser());
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      this.loading.set(false);
      return;
    }

    this.currentUser.set(response.successResponse!);
  }
}
