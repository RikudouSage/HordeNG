import {Component, OnInit, signal, WritableSignal} from '@angular/core';
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

@Component({
  selector: 'app-horde',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    TranslocoMarkupComponent,
    SmallBoxComponent,
    FormatNumberPipe,
    BoxComponent
  ],
  templateUrl: './horde.component.html',
  styleUrl: './horde.component.scss'
})
export class HordeComponent implements OnInit {
  public loading = signal(true);

  public currentUser: WritableSignal<UserDetails | null> = signal(null);
  public performanceStatus: WritableSignal<HordePerformance | null> = signal(null);

  public kudosIcon = signal(faCoins);
  public requestedIcon = signal(faImage);
  public generatedIcon = signal(faCrosshairs);

  constructor(
    private readonly horde: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
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

    this.loading.set(false);
  }
}
