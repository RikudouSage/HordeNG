import {Component, Inject, OnInit, PLATFORM_ID, signal, WritableSignal} from '@angular/core';
import {LoaderComponent} from "../../components/loader/loader.component";
import {AiHorde} from "../../services/ai-horde.service";
import {UserDetails} from "../../types/horde/user-details";
import {toPromise} from "../../helper/resolvable";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {TranslocoPipe} from "@ngneat/transloco";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {SmallBoxComponent} from "../../components/small-box/small-box.component";
import {faCoins, faCrosshairs, faImage} from "@fortawesome/free-solid-svg-icons";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {BoxComponent} from "../../components/box/box.component";
import {HordePerformance} from "../../types/horde/horde-performance";
import {WorkerDetails} from "../../types/horde/worker-details";
import {AsyncPipe, isPlatformBrowser} from "@angular/common";
import {interval} from "rxjs";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {WorkerType} from "../../types/horde/worker-type";

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
    MathSqrtPipe
  ],
  templateUrl: './horde.component.html',
  styleUrl: './horde.component.scss'
})
export class HordeComponent implements OnInit {
  private readonly isBrowser: boolean;

  public loading = signal(true);

  public currentUser: WritableSignal<UserDetails | null> = signal(null);
  public performanceStatus: WritableSignal<HordePerformance | null> = signal(null);
  public workers: WritableSignal<WorkerDetails[]> = signal([]);

  public kudosIcon = signal(faCoins);
  public requestedIcon = signal(faImage);
  public generatedIcon = signal(faCrosshairs);

  constructor(
    private readonly horde: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    await this.loadData();
    if (this.isBrowser) {
      interval(60_000).subscribe(() => {
        this.loadData();
      });
    }
  }

  private async loadData(): Promise<void> {
    const responses = await Promise.all([
      toPromise(this.horde.currentUser()),
      toPromise(this.horde.getPerformanceStatus()),
    ]);

    for (const response of responses) {
      if (!response.success) {
        await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
        this.loading.set(false);
        return;
      }
    }

    this.currentUser.set(responses[0].successResponse!);
    this.performanceStatus.set(responses[1].successResponse!);

    const workers = await Promise.all(this.currentUser()!.worker_ids.map(async workerId => {
      const response = await toPromise(this.horde.getWorkerDetail(workerId));
      if (!response.success) {
        return null;
      }

      return response.successResponse!;
    }));
    this.workers.set(<WorkerDetails[]>workers.filter(worker => worker !== null && worker.type === WorkerType.image));

    this.loading.set(false);
  }

  protected readonly WorkerType = WorkerType;
}
