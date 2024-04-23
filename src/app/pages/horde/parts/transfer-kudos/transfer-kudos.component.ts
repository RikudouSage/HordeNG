import {Component, input, output, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {TranslocoPipe} from "@ngneat/transloco";
import {BoxComponent} from "../../../../components/box/box.component";
import {LoaderComponent} from "../../../../components/loader/loader.component";
import {UserDetails} from "../../../../types/horde/user-details";
import {AppValidators} from "../../../../helper/app-validators";
import {AiHorde} from "../../../../services/ai-horde.service";
import {MessageService} from "../../../../services/message.service";
import {TranslatorService} from "../../../../services/translator.service";
import {toPromise} from "../../../../helper/resolvable";

@Component({
  selector: 'app-transfer-kudos',
  standalone: true,
  imports: [
    BoxComponent,
    ReactiveFormsModule,
    TranslocoMarkupComponent,
    TranslocoPipe,
    LoaderComponent
  ],
  templateUrl: './transfer-kudos.component.html',
  styleUrl: './transfer-kudos.component.scss'
})
export class TransferKudosComponent {
  public currentUser = input.required<UserDetails>();
  public loading = signal(false);

  public kudosTransferred = output();

  public transferKudosForm = new FormGroup({
    targetUser: new FormControl<string | null>(null, [
      Validators.required,
      AppValidators.regex(/.+#[0-9]+/),
    ]),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      AppValidators.lazyMax(() => this.currentUser()?.kudos ?? 0),
      Validators.min(1),
    ]),
  });

  constructor(
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
  ) {
  }

  public async transferKudos(): Promise<void> {
    if (!this.transferKudosForm.valid) {
      await this.messageService.error(this.translator.get('app.error.form_invalid'));
      return;
    }
    this.loading.set(true);
    const response = await toPromise(this.api.transferKudos(
      this.transferKudosForm.controls.targetUser.value!,
      this.transferKudosForm.controls.amount.value!,
    ));
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      this.loading.set(false);
      return;
    }

    await this.messageService.success(this.translator.get('app.transfer_kudos.success'));
    this.kudosTransferred.emit();
    this.transferKudosForm.patchValue({
      amount: null,
    });
    this.loading.set(false);
  }

}
