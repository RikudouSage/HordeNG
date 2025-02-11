import {Component, Directive, effect, input, OnInit, output, Signal, signal, TemplateRef} from '@angular/core';
import {TranslocoPipe} from "@jsverse/transloco";
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {faPencil, faShare, faTrash} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {BoxComponent} from "../../../../components/box/box.component";
import {LoaderComponent} from "../../../../components/loader/loader.component";
import {CopyButtonComponent} from "../../../../components/copy-button/copy-button.component";
import {FormatNumberPipe} from "../../../../pipes/format-number.pipe";
import {FormatDatetimePipe} from "../../../../pipes/format-date.pipe";
import {UserDetails} from "../../../../types/horde/user-details";
import {SharedKey} from "../../../../types/horde/shared-key";
import {AppValidators} from "../../../../helper/app-validators";
import {AiHorde} from "../../../../services/ai-horde.service";
import {MessageService} from "../../../../services/message.service";
import {TranslatorService} from "../../../../services/translator.service";
import {ModalService} from "../../../../services/modal.service";
import {toPromise} from "../../../../helper/resolvable";
import {ApiResponse} from "../../../../types/api-response";

@Directive({
  selector: 'ng-template[shared-key-form]',
  standalone: true,
})
export class SharedKeyFormNgTemplate {
  static ngTemplateContextGuard(
    directive: SharedKeyFormNgTemplate,
    context: unknown
  ): context is {sharedKey?: SharedKey} {
    return true;
  }
}

@Component({
  selector: 'app-shared-keys',
  standalone: true,
  imports: [
    BoxComponent,
    TranslocoPipe,
    LoaderComponent,
    CopyButtonComponent,
    FormatNumberPipe,
    FormatDatetimePipe,
    FaIconComponent,
    ReactiveFormsModule,
    SharedKeyFormNgTemplate
  ],
  templateUrl: './shared-keys.component.html',
  styleUrl: './shared-keys.component.scss'
})
export class SharedKeysComponent implements OnInit {
  public currentUser = input.required<UserDetails>();

  public loading = signal(true);
  public removeIcon: Signal<IconDefinition> = signal(faTrash);
  public editIcon: Signal<IconDefinition> = signal(faPencil);
  public shareIcon: Signal<IconDefinition> = signal(faShare);
  public sharedKeyDetails = signal<SharedKey[] | null>(null);

  public sharedKeyRemoved = output<string>();
  public sharedKeyCreated = output<string>();

  public form = new FormGroup({
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
    private readonly modalService: ModalService,
  ) {
    effect(() => {
      this.currentUser(); // just for subscription
      this.loadData().then(() => {
        this.loading.set(false);
      })
    }, {
      allowSignalWrites: true,
    });
  }

  public async ngOnInit(): Promise<void> {
    this.form.controls.maxImagePixels.valueChanges.subscribe(value => {
      if (value === null) {
        return;
      }

      if (value < -1) {
        this.form.patchValue({maxImagePixels: -1});
      }
    });
  }

  private async loadData(): Promise<void> {
    if (!this.currentUser()!.sharedkey_ids?.length) {
      this.sharedKeyDetails.set([]);
      return;
    }
    const response = await toPromise(this.api.getSharedKeys(this.currentUser().sharedkey_ids ?? []));
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      this.loading.set(false);
      return;
    }

    this.sharedKeyDetails.set(response.successResponse!);
  }

  public async removeSharedKey(sharedKey: SharedKey): Promise<void> {
    this.loading.set(true);
    const response = await toPromise(this.api.removeSharedKey(sharedKey));
    if (response.success) {
      await this.messageService.success(this.translator.get('app.success.shared_key.remove'));
      this.sharedKeyRemoved.emit(sharedKey.id);
      this.sharedKeyDetails.update(value => value!.filter(key => key.id !== sharedKey.id));
    } else {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
    }
    this.loading.set(false);
  }

  public async openModal(modal: TemplateRef<any>, sharedKey?: SharedKey): Promise<void> {
    this.form.patchValue({
      name: sharedKey?.name,
      expiry: sharedKey?.expiry ? Number(sharedKey.expiry) : -1,
      kudosLimit: sharedKey?.kudos ?? 5_000,
      maxImagePixels: sharedKey?.max_image_pixels ?? -1,
      maxImageSteps: sharedKey?.max_image_steps ?? -1,
      maxTextTokens: sharedKey?.max_text_tokens ?? -1,
    })

    this.modalService.open(modal, {
      context: {
        sharedKey: sharedKey,
      }
    });
  }

  public async saveSharedKey(sharedKey?: SharedKey): Promise<void> {
    if (!this.form.valid) {
      await this.messageService.error(this.translator.get('app.error.form_invalid'));
      return;
    }
    await this.modalService.close();

    const form = this.form.value;
    this.loading.set(true);

    let response: ApiResponse<SharedKey>;
    if (sharedKey === undefined) {
      response = await toPromise(this.api.createSharedKey({
        name: form.name!,
        expiry: form.expiry!,
        kudos: form.kudosLimit!,
        max_image_pixels: form.maxImagePixels!,
        max_image_steps: form.maxImageSteps!,
        max_text_tokens: form.maxTextTokens!,
      }));
    } else {
      response = await toPromise(this.api.updateSharedKey({
        name: form.name!,
        expiry: String(form.expiry!),
        kudos: form.kudosLimit!,
        max_image_pixels: form.maxImagePixels!,
        max_image_steps: form.maxImageSteps!,
        max_text_tokens: form.maxTextTokens!,
        id: sharedKey.id,
      }))
    }

    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      this.loading.set(false);
      return;
    }

    if (sharedKey === undefined) {
      await this.messageService.success(this.translator.get('app.shared_key.create.success'));
      this.sharedKeyCreated.emit(response.successResponse!.id);
    } else {
      await this.messageService.success(this.translator.get('app.shared_key.update.success'));
    }

    await this.loadData();
    this.loading.set(false);
  }

  public async shareLink(sharedKey: SharedKey): Promise<void> {
    const url = `${window.location.protocol}//${window.location.host}/generate?apiKey=${sharedKey.id}`;

    const params = {
      url: url,
      title: 'HordeNG',
    };

    if (typeof navigator === 'undefined' || typeof navigator.share === 'undefined' || !navigator.canShare(params)) {
      await navigator.clipboard.writeText(url);
      await this.messageService.success(this.translator.get('app.shared_key.share.copied'));
      return;
    }

    try {
      await navigator.share(params);
    } catch (e) {
      await navigator.clipboard.writeText(url);
      await this.messageService.success(this.translator.get('app.shared_key.share.copied'));
    }
  }
}
