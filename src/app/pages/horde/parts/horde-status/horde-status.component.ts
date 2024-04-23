import {Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, WritableSignal} from '@angular/core';
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {interval, Subscription} from "rxjs";
import {TranslocoPipe} from "@ngneat/transloco";
import {isPlatformBrowser} from "@angular/common";
import {BoxComponent} from "../../../../components/box/box.component";
import {FormatNumberPipe} from "../../../../pipes/format-number.pipe";
import {LoaderComponent} from "../../../../components/loader/loader.component";
import {HordePerformance} from "../../../../types/horde/horde-performance";
import {AiHorde} from "../../../../services/ai-horde.service";
import {MessageService} from "../../../../services/message.service";
import {TranslatorService} from "../../../../services/translator.service";
import {toPromise} from "../../../../helper/resolvable";

@Component({
  selector: 'app-horde-status',
  standalone: true,
  imports: [
    BoxComponent,
    TranslocoMarkupComponent,
    TranslocoPipe,
    FormatNumberPipe,
    LoaderComponent
  ],
  templateUrl: './horde-status.component.html',
  styleUrl: './horde-status.component.scss'
})
export class HordeStatusComponent implements OnInit, OnDestroy {
  private refreshInterval: Subscription | null = null;
  private readonly isBrowser: boolean;

  public performanceStatus: WritableSignal<HordePerformance | null> = signal(null);

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
      this.refreshInterval = interval(15_000).subscribe(async () => {
        await this.loadData();
      });
    }
  }

  private async loadData(): Promise<void> {
    const response = await toPromise(this.api.getPerformanceStatus());
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      return;
    }
    this.performanceStatus.set(response.successResponse!);
  }
}
