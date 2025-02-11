import {Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal, ViewContainerRef} from '@angular/core';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {TopMenuComponent} from "./components/top-menu/top-menu.component";
import {AiHorde} from "./services/ai-horde.service";
import {AuthManagerService} from "./services/auth-manager.service";
import {toPromise} from "./helper/resolvable";
import {globalAppView} from "./global-app-view";
import {SwUpdate} from "@angular/service-worker";
import {ToastrService} from "ngx-toastr";
import {TranslatorService} from "./services/translator.service";
import {FooterComponent} from "./components/footer/footer.component";
import {MessageService} from "./services/message.service";
import {TranslocoService} from "@jsverse/transloco";
import {DatabaseService} from "./services/database.service";
import {findBrowserLanguage} from "./helper/language";
import {isPlatformBrowser} from "@angular/common";
import {NotificationService} from "./services/notification/notification.service";
import {interval, startWith} from "rxjs";
import {Subscriptions} from "./helper/subscriptions";
import {CensorshipService} from "./services/censorship.service";
import {PrivateMessageService} from "./services/private-message.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopMenuComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly isBrowser: boolean;
  private updateChecked = signal(false);
  private readonly subscriptions = new Subscriptions();

  constructor(
    private readonly aiHorde: AiHorde,
    private readonly authManager: AuthManagerService,
    private readonly updates: SwUpdate,
    private readonly toastr: ToastrService,
    private readonly translator: TranslatorService,
    private readonly messenger: MessageService,
    private readonly transloco: TranslocoService,
    private readonly database: DatabaseService,
    @Inject(PLATFORM_ID) platformId: string,
    private readonly notifications: NotificationService,
    private readonly router: Router,
    private readonly censorshipService: CensorshipService,
    private readonly privateMessageService: PrivateMessageService,
    private readonly activatedRoute: ActivatedRoute,
    view: ViewContainerRef,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    globalAppView.set(view);
  }

  public async ngOnInit(): Promise<void> {
    this.censorshipService.initialize();
    if (this.isBrowser) {
      const availableLanguages = this.transloco.getAvailableLangs().map(value => typeof value === 'string' ? value : value.id);
      const storedLanguage = await this.database.getAppLanguage();
      if (storedLanguage) {
        this.transloco.setActiveLang(storedLanguage);
      } else if (typeof navigator !== 'undefined') {
        this.transloco.setActiveLang(findBrowserLanguage(availableLanguages) ?? 'en')
      }

      let currentlyDisplayed: string | null = null;
      this.subscriptions.add(interval(60_000).pipe(startWith(0)).subscribe(async () => {
        const notification = await this.notifications.getNotificationToDisplay();
        if (notification === null) {
          return;
        }
        if (notification.id === currentlyDisplayed) {
          return;
        }

        const item = this.toastr.info(
          notification.description ? notification.description : notification.title,
          notification.description ? notification.title : undefined,
          {
            closeButton: true,
            disableTimeOut: true,
          }
        );
        currentlyDisplayed = notification.id;
        this.subscriptions.add(item.onTap.subscribe(() => {
          if (notification.link) {
            if (notification.link.startsWith('/')) {
              console.log(notification.link)
              this.router.navigateByUrl(notification.link);
            } else {
              window.open(notification.link, "_blank");
            }
          }
        }));
        this.subscriptions.add(item.onHidden.subscribe(async () => {
          currentlyDisplayed = null;
          await this.notifications.markAsRead(notification);
        }));
      }));

      let currentlyDisplayedPrivateMessage: string | null = null;
      this.subscriptions.add(interval(60_000).pipe(startWith(0)).subscribe(async () => {
        const message = await this.privateMessageService.getMessageToDisplay();
        if (message === null) {
          return;
        }

        if (currentlyDisplayedPrivateMessage === message.id) {
          return;
        }
        currentlyDisplayedPrivateMessage = message.id;

        const item = this.toastr.info(
          message.message,
          await toPromise(this.translator.get('app.private_message.title', {from: message.origin})),
          {
            closeButton: true,
            disableTimeOut: true,
          }
        );
        this.subscriptions.add(item.onHidden.subscribe(async () => {
          currentlyDisplayedPrivateMessage = null;
          await this.privateMessageService.markAsRead(message);
        }));
      }));
    }

    if (this.updates.isEnabled) {
      this.updates.versionUpdates.subscribe(async event => {
        if (this.updateChecked()) {
          return;
        }
        if (event.type === 'VERSION_READY') {
          const toast = this.toastr.success(
            await toPromise(this.translator.get('app.new_version.available')),
            await toPromise(this.translator.get('app.new_version.title')),
            {
              closeButton: true,
              disableTimeOut: true,
              tapToDismiss: false,
            }
          );
          toast.onTap.subscribe(() => {
            window.location.reload();
          });
        }
      });

      await this.updates.checkForUpdate();
      this.updateChecked.set(true);
    }

    if (this.authManager.apiKey() !== this.authManager.anonymousApiKey) {
      const user = await toPromise(this.aiHorde.currentUser());
      if (!user.success) {
        await this.messenger.error(this.translator.get('app.error.invalid_api_key_global'));
      }
    }

    if (typeof navigator !== 'undefined' && navigator.storage !== undefined && !await navigator.storage.persisted()) {
      await navigator.storage.persist();
    }

    this.activatedRoute.queryParamMap.subscribe(paramMap => {
      if (!paramMap.has('apiKey')) {
        return;
      }
      this.authManager.apiKey = paramMap.get('apiKey')!;
    });
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
