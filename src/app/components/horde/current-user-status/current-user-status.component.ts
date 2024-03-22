import {Component, Inject, input, OnDestroy, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {FormatNumberPipe} from "../../../pipes/format-number.pipe";
import {SmallBoxComponent} from "../../small-box/small-box.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {faCoins, faCrosshairs, faImage} from "@fortawesome/free-solid-svg-icons";
import {UserDetails} from "../../../types/horde/user-details";
import {AiHorde} from "../../../services/ai-horde.service";
import {MessageService} from "../../../services/message.service";
import {TranslatorService} from "../../../services/translator.service";
import {isPlatformBrowser} from "@angular/common";
import {interval, Subscription} from "rxjs";
import {toPromise} from "../../../helper/resolvable";

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

  public user = signal<UserDetails | null>(null);

  constructor(
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    this.user.set(this.currentUser());

    if (this.isBrowser) {
      this.refreshInterval = interval(30_000).subscribe(async () => {
        const response = await toPromise(this.api.currentUser());
        if (!response.success) {
          await this.messageService.error(this.translator.get('app.error.api_error', {
            message: response.errorResponse!.message,
            code: response.errorResponse!.rc
          }));
          return;
        }
        this.user.set(response.successResponse!);
      });
    }
  }

  public async ngOnDestroy(): Promise<void> {
    this.refreshInterval?.unsubscribe();
  }
}
