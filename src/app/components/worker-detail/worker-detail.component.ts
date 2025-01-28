import {Component, computed, input, OnInit, output, signal, TemplateRef, viewChild} from '@angular/core';
import {WorkerDetails} from "../../types/horde/worker-details";
import {WorkerType} from "../../types/horde/worker-type";
import {BoxButton, BoxComponent} from "../box/box.component";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {TranslocoPipe, TranslocoService} from "@jsverse/transloco";
import {YesNoComponent} from "../yes-no/yes-no.component";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {AsyncPipe} from "@angular/common";
import {faMessage, faPauseCircle, faPlayCircle} from "@fortawesome/free-solid-svg-icons";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {ModalService} from "../../services/modal.service";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AutoGrowDirective} from "../../directives/auto-grow.directive";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {CacheService} from "../../services/cache.service";

@Component({
  selector: 'app-worker-detail',
  standalone: true,
  imports: [
    BoxComponent,
    FormatNumberPipe,
    TranslocoPipe,
    YesNoComponent,
    MathSqrtPipe,
    PrintSecondsPipe,
    AsyncPipe,
    ReactiveFormsModule,
    AutoGrowDirective,
    TranslocoMarkupComponent
  ],
  templateUrl: './worker-detail.component.html',
  styleUrl: './worker-detail.component.scss'
})
export class WorkerDetailComponent implements OnInit {
  protected readonly WorkerType = WorkerType;

  public worker = input.required<WorkerDetails>()

  public collapsible = input(false);
  public collapsedByDefault = input(false);

  public onlineInTitle = input(false);
  public editable = input(false);
  public canSendMessage = input(false);

  public paused = computed(() => this.worker().paused || this.worker().maintenance_mode);
  public isDeleted = signal(false);
  public loading = signal(false);

  public sendMessageForm = new FormGroup({
    message: new FormControl<string>('', [Validators.required]),
    expiry: new FormControl<number>(1, [Validators.required]),
    origin: new FormControl<string>('HordeNG', [Validators.required]), // todo
  });

  public buttons = computed((): BoxButton[] => {
    if (!this.editable()) {
      return [];
    }

    const buttons: BoxButton[] = [];

    if (this.canSendMessage() && this.modal()) {
      buttons.push({
        icon: faMessage,
        enabled: true,
        action: async event => {
          event.preventDefault();
          event.stopPropagation();

          this.modalService.open(this.modal()!);
        },
        title: this.transloco.translate('app.worker.send_message')
      })
    }

    if (!this.paused()) {
      buttons.push({
        icon: faPauseCircle,
        enabled: true,
        action: async event => {
          event.preventDefault();
          event.stopPropagation();

          await toPromise(this.api.updateWorker(this.worker().id, {maintenance: true}));
          this.pauseStatusUpdated.emit(true);
        },
        title: this.transloco.translate('app.worker.pause'),
      });
    } else {
      buttons.push({
        icon: faPlayCircle,
        enabled: true,
        action: async event => {
          event.preventDefault();
          event.stopPropagation();

          await toPromise(this.api.updateWorker(this.worker().id, {maintenance: false}));
          this.pauseStatusUpdated.emit(false);
        },
        title: this.transloco.translate('app.worker.resume'),
      });
    }

    return buttons;
  })

  public title = computed(() => {
    let title = this.worker().name;
    if (this.onlineInTitle()) {
      const onlineText = (this.worker().online ? this.transloco.translate('app.worker.online') : this.transloco.translate('app.worker.offline'));
      title += ` (<span class="${this.worker().online ? 'text-success' : 'text-warning'}">${onlineText}</span>)`;
    }

    return title;
  });

  public pauseStatusUpdated = output<boolean>();
  public deleted = output<void>();

  private modal = viewChild<TemplateRef<unknown>>('sendMessageModal');

  constructor(
    private readonly transloco: TranslocoService,
    private readonly api: AiHorde,
    private readonly messenger: MessageService,
    private readonly translator: TranslatorService,
    private readonly modalService: ModalService,
    private readonly cacheService: CacheService,
  ) {
  }

  public async ngOnInit() {
    const origin = await this.cacheService.getItem<string>('app.private_message.origin');
    const expiry = await this.cacheService.getItem<number>('app.private_message.expiry');
    if (origin.isHit) {
      this.sendMessageForm.patchValue({origin: origin.value});
    }
    if (expiry.isHit) {
      this.sendMessageForm.patchValue({expiry: expiry.value});
    }
  }

  public async deleteWorker(): Promise<void> {
    const response = await toPromise(this.api.deleteWorker(this.worker().id));
    if (!response.success) {
      await this.messenger.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      return;
    }

    await this.messenger.success(this.translator.get('app.worker.deleted'));

    this.isDeleted.set(true);
    this.deleted.emit();
  }

  public async sendMessage(): Promise<void> {
    if (!this.sendMessageForm.valid) {
      await this.messenger.error(this.translator.get('app.error.form_invalid'));
      return;
    }

    this.loading.set(true);
    const form = this.sendMessageForm.value;
    const result = await toPromise(this.api.sendMessage({
      message: form.message!,
      expiry: form.expiry!,
      origin: form.origin!,
      worker_id: this.worker()!.id,
    }));

    if (!result.success) {
      await this.messenger.error(this.translator.get('app.error.api_error', {message: result.errorResponse!.message, code: result.errorResponse!.rc}));
      this.loading.set(false);
      return;
    }

    await this.messenger.success(this.translator.get('app.success.private_message'));
    this.loading.set(false);
    await this.modalService.close();
  }
}
