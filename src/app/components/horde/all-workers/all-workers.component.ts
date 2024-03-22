import {Component, OnDestroy, signal} from '@angular/core';
import {BoxComponent} from "../../box/box.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {interval, Subscription} from "rxjs";
import {WorkerDetails} from "../../../types/horde/worker-details";
import {AiHorde} from "../../../services/ai-horde.service";
import {toPromise} from "../../../helper/resolvable";
import {MessageService} from "../../../services/message.service";
import {TranslatorService} from "../../../services/translator.service";
import {LoaderComponent} from "../../loader/loader.component";
import {WorkerDetailComponent} from "../../worker-detail/worker-detail.component";

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

  public workers = signal<WorkerDetails[] | null>(null);

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
    this.workers.set(response.successResponse!);
  }
}
