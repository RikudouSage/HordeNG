import {Component, Inject, input, OnDestroy, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {TranslocoPipe} from "@jsverse/transloco";
import {isPlatformBrowser} from "@angular/common";
import {interval, Subscription} from "rxjs";
import {BoxComponent} from "../../../../components/box/box.component";
import {WorkerDetailComponent} from "../../../../components/worker-detail/worker-detail.component";
import {LoaderComponent} from "../../../../components/loader/loader.component";
import {UserDetails} from "../../../../types/horde/user-details";
import {WorkerDetails} from "../../../../types/horde/worker-details";
import {AiHorde} from "../../../../services/ai-horde.service";
import {MessageService} from "../../../../services/message.service";
import {TranslatorService} from "../../../../services/translator.service";
import {toPromise} from "../../../../helper/resolvable";

@Component({
  selector: 'app-your-workers',
  standalone: true,
  imports: [
    BoxComponent,
    TranslocoPipe,
    WorkerDetailComponent,
    LoaderComponent
  ],
  templateUrl: './your-workers.component.html',
  styleUrl: './your-workers.component.scss'
})
export class YourWorkersComponent implements OnInit, OnDestroy {
  private readonly isBrowser: boolean;
  private refreshInterval: Subscription | null = null;

  public currentUser = input.required<UserDetails>();
  public workers = signal<WorkerDetails[] | null>(null);

  constructor(
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnDestroy(): void {
    this.refreshInterval?.unsubscribe();
  }

  public async ngOnInit(): Promise<void> {
    await this.loadData();
    if (this.isBrowser) {
      this.refreshInterval = interval(30_000).subscribe(async () => {
        await this.loadData();
      });
    }
  }

  private async loadData(): Promise<void> {
    const promises = this.currentUser().worker_ids?.map(id => toPromise(this.api.getWorkerDetail(id))) ?? [];
    const responses = await Promise.all(promises);
    for (const response of responses) {
      if (!response.success && response.statusCode !== 404) {
        await this.messageService.error(this.translator.get('app.error.api_error', {
          message: response.errorResponse!.message,
          code: response.errorResponse!.rc
        }));
        return;
      }
    }

    this.workers.set(
      responses
        .filter(response => response.success)
        .map(response => response.successResponse!)
    );
  }

  public async refreshWorkerPauseStatus(targetWorker: WorkerDetails, paused: boolean): Promise<void> {
    this.workers.update(workers => {
      if (workers === null) {
        return null;
      }

      const result: WorkerDetails[] = [];

      for (const worker of workers) {
        const newWorker = {...worker};
        if (newWorker.id === targetWorker.id) {
          newWorker.maintenance_mode = paused;
        }

        result.push(newWorker);
      }

      return result;
    });
  }
}
