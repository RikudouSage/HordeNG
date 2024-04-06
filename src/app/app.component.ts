import {Component, OnInit, signal, ViewContainerRef} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {TopMenuComponent} from "./components/top-menu/top-menu.component";
import {AiHorde} from "./services/ai-horde.service";
import {AuthManagerService} from "./services/auth-manager.service";
import {toPromise} from "./helper/resolvable";
import {globalAppView} from "./global-app-view";
import {SwUpdate} from "@angular/service-worker";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopMenuComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private updateChecked = signal(false);
  private updateAvailable = signal(false);

  constructor(
    private readonly aiHorde: AiHorde,
    private readonly authManager: AuthManagerService,
    private readonly updates: SwUpdate,
    view: ViewContainerRef,
  ) {
    globalAppView.set(view);
  }

  public async ngOnInit(): Promise<void> {
    if (this.updates.isEnabled) {
      this.updates.versionUpdates.subscribe(event => {
        if (this.updateChecked()) {
          return;
        }
        if (event.type === 'VERSION_READY') {
          this.updateAvailable.set(true);
          window.location.reload();
        }
      });

      await this.updates.checkForUpdate();
      this.updateChecked.set(true);
    }

    if (this.authManager.apiKey() !== this.authManager.anonymousApiKey) {
      const user = await toPromise(this.aiHorde.currentUser());
      if (!user.success) {
        this.authManager.apiKey = this.authManager.anonymousApiKey;
      }
    }
  }
}
