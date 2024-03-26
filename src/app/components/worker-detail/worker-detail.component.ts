import {Component, computed, input, output} from '@angular/core';
import {WorkerDetails} from "../../types/horde/worker-details";
import {WorkerType} from "../../types/horde/worker-type";
import {BoxButton, BoxComponent} from "../box/box.component";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {TranslocoPipe, TranslocoService} from "@ngneat/transloco";
import {YesNoComponent} from "../yes-no/yes-no.component";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {AsyncPipe} from "@angular/common";
import {faPause, faPlay} from "@fortawesome/free-solid-svg-icons";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";

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
  public pausable = input(false);

  public paused = computed(() => this.worker().paused || this.worker().maintenance_mode);

  public buttons = computed((): BoxButton[] => {
    if (!this.pausable()) {
      return [];
    }

    if (!this.paused()) {
      return [{
        icon: faPause,
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
        icon: faPlay,
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
      title += ' (' + (this.worker().online ? this.transloco.translate('app.worker.online') : this.transloco.translate('app.worker.offline')) + ')';
    }

    return title;
  });

  public pauseStatusUpdated = output<boolean>();

  constructor(
    private readonly transloco: TranslocoService,
    private readonly api: AiHorde,
  ) {
  }
}
