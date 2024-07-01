import {Component, computed, input, output, signal} from '@angular/core';
import {WorkerDetails} from "../../types/horde/worker-details";
import {WorkerType} from "../../types/horde/worker-type";
import {BoxButton, BoxComponent} from "../box/box.component";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {TranslocoPipe, TranslocoService} from "@jsverse/transloco";
import {YesNoComponent} from "../yes-no/yes-no.component";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {AsyncPipe} from "@angular/common";
import {faPauseCircle, faPlayCircle} from "@fortawesome/free-solid-svg-icons";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";

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
    AsyncPipe
  ],
  templateUrl: './worker-detail.component.html',
  styleUrl: './worker-detail.component.scss'
})
export class WorkerDetailComponent {
  protected readonly WorkerType = WorkerType;

  public worker = input.required<WorkerDetails>()

  public collapsible = input(false);
  public collapsedByDefault = input(false);

  public onlineInTitle = input(false);
  public editable = input(false);

  public paused = computed(() => this.worker().paused || this.worker().maintenance_mode);
  public isDeleted = signal(false);

  public buttons = computed((): BoxButton[] => {
    if (!this.editable()) {
      return [];
    }

    if (!this.paused()) {
      return [{
        icon: faPauseCircle,
        enabled: true,
        action: async event => {
          event.preventDefault();
          event.stopPropagation();

          await toPromise(this.api.updateWorker(this.worker().id, {maintenance: true}));
          this.pauseStatusUpdated.emit(true);
        },
        title: this.transloco.translate('app.worker.pause'),
      }];
    } else {
      return [{
        icon: faPlayCircle,
        enabled: true,
        action: async event => {
          event.preventDefault();
          event.stopPropagation();

          await toPromise(this.api.updateWorker(this.worker().id, {maintenance: false}));
          this.pauseStatusUpdated.emit(false);
        },
        title: this.transloco.translate('app.worker.resume'),
      }];
    }
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

  constructor(
    private readonly transloco: TranslocoService,
    private readonly api: AiHorde,
    private readonly messenger: MessageService,
    private readonly translator: TranslatorService,
  ) {
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
}
