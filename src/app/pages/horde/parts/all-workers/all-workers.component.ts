import {Component, computed, OnDestroy, signal} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {interval, Subscription} from "rxjs";
import {BoxComponent} from "../../../../components/box/box.component";
import {LoaderComponent} from "../../../../components/loader/loader.component";
import {WorkerDetailComponent} from "../../../../components/worker-detail/worker-detail.component";
import {WorkerDetails} from "../../../../types/horde/worker-details";
import {AiHorde} from "../../../../services/ai-horde.service";
import {MessageService} from "../../../../services/message.service";
import {TranslatorService} from "../../../../services/translator.service";
import {toPromise} from "../../../../helper/resolvable";

@Component({
  selector: 'app-all-workers',
  standalone: true,
  imports: [
    BoxComponent,
    TranslocoPipe,
    LoaderComponent,
    WorkerDetailComponent
  ],
  templateUrl: './all-workers.component.html',
  styleUrl: './all-workers.component.scss'
})
export class AllWorkersComponent implements OnDestroy {
  private refreshInterval: Subscription | null = null;

  private allWorkers = signal<WorkerDetails[] | null>(null);
  public workers = computed(() => {
    if (this.allWorkers() === null) {
      return null;
    }

    return this.allWorkers()!.sort((a, b) => {
      if (a.models.length === b.models.length) {
        return 0;
      }

      return a.models.length > b.models.length ? -1 : 1;
    })
  });
  public count = computed(() => {
    if (this.workers() === null) {
      return null;
    }

    return this.workers()!.length;
  })

  constructor(
    private readonly api: AiHorde,
    private readonly messenger: MessageService,
    private readonly translator: TranslatorService,
  ) {
  }

  public ngOnDestroy(): void {
    this.refreshInterval?.unsubscribe();
  }

  public async loadAllWorkers(): Promise<void> {
    this.refreshInterval ??= interval(60_000).subscribe(async () => {
      await this.loadWorkers();
    });

    await this.loadWorkers();
  }

  public async pauseWorkerUpdates(): Promise<void> {
    this.refreshInterval?.unsubscribe();
  }

  private async loadWorkers(): Promise<void> {
    const response = await toPromise(this.api.getAllWorkers());
    if (!response.success) {
      await this.messenger.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      return;
    }
    this.allWorkers.set(response.successResponse!);
  }
}
