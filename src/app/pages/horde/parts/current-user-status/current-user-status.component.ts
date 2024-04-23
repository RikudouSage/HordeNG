import {Component, Inject, input, OnDestroy, OnInit, output, PLATFORM_ID, signal} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {faCoins, faCrosshairs, faImage} from "@fortawesome/free-solid-svg-icons";
import {isPlatformBrowser} from "@angular/common";
import {interval, Subscription} from "rxjs";
import {FormatNumberPipe} from "../../../../pipes/format-number.pipe";
import {SmallBoxComponent} from "../../../../components/small-box/small-box.component";
import {UserDetails} from "../../../../types/horde/user-details";
import {AiHorde} from "../../../../services/ai-horde.service";
import {MessageService} from "../../../../services/message.service";
import {TranslatorService} from "../../../../services/translator.service";

@Component({
  selector: 'app-current-user-status',
  standalone: true,
  imports: [
    FormatNumberPipe,
    SmallBoxComponent,
    TranslocoPipe
  ],
  templateUrl: './current-user-status.component.html',
  styleUrl: './current-user-status.component.scss'
})
export class CurrentUserStatusComponent implements OnInit, OnDestroy {
  private readonly isBrowser: boolean;
  private refreshInterval: Subscription | null = null;

  public currentUser = input.required<UserDetails>();

  public kudosIcon = signal(faCoins);
  public requestedIcon = signal(faImage);
  public generatedIcon = signal(faCrosshairs);

  public refreshRequested = output();

  constructor(
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    if (this.isBrowser) {
      this.refreshInterval = interval(30_000).subscribe(() => {
        this.refreshRequested.emit();
      });
    }
  }

  public async ngOnDestroy(): Promise<void> {
    this.refreshInterval?.unsubscribe();
  }
}
