import {Component, Inject, OnInit, PLATFORM_ID, ViewContainerRef} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {TopMenuComponent} from "./components/top-menu/top-menu.component";
import {AiHorde} from "./services/ai-horde.service";
import {AuthManagerService} from "./services/auth-manager.service";
import {toPromise} from "./helper/resolvable";
import {DataStorageManagerService} from "./services/data-storage-manager.service";
import {isPlatformBrowser} from "@angular/common";
import {S3DataStorage} from "./services/image-storage/s3.data-storage";
import {globalAppView} from "./global-app-view";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopMenuComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly isBrowser: boolean;

  constructor(
    private readonly aiHorde: AiHorde,
    private readonly authManager: AuthManagerService,
    private readonly storageManager: DataStorageManagerService,
    view: ViewContainerRef,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    globalAppView.set(view);
  }

  public async ngOnInit(): Promise<void> {
    if (this.authManager.apiKey() !== this.authManager.anonymousApiKey) {
      const user = await toPromise(this.aiHorde.currentUser());
      if (!user.success) {
        this.authManager.apiKey = this.authManager.anonymousApiKey;
      }
    }
  }
}
