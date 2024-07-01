import {Component, Inject, OnInit, PLATFORM_ID, signal, ViewContainerRef} from '@angular/core';
import {RouterOutlet} from '@angular/router';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopMenuComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly isBrowser: boolean;
  private updateChecked = signal(false);

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
    view: ViewContainerRef,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    globalAppView.set(view);
  }

  public async ngOnInit(): Promise<void> {
    if (this.isBrowser) {
      const availableLanguages = this.transloco.getAvailableLangs().map(value => typeof value === 'string' ? value : value.id);
      const storedLanguage = await this.database.getAppLanguage();
      if (storedLanguage) {
        this.transloco.setActiveLang(storedLanguage);
      } else if (typeof navigator !== 'undefined') {
        this.transloco.setActiveLang(findBrowserLanguage(availableLanguages) ?? 'en')
      }
    }

    if (this.updates.isEnabled) {
      this.updates.versionUpdates.subscribe(async event => {
        if (this.updateChecked()) {
          return;
        }
        if (event.type === 'VERSION_READY') {
          const toast = this.toastr.info(
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

    if (typeof navigator !== 'undefined' && !await navigator.storage.persisted()) {
      await navigator.storage.persist();
    }
  }
}
