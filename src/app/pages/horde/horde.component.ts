import {Component, computed, Inject, OnInit, PLATFORM_ID, signal, WritableSignal} from '@angular/core';
import {LoaderComponent} from "../../components/loader/loader.component";
import {AiHorde} from "../../services/ai-horde.service";
import {UserDetails} from "../../types/horde/user-details";
import {toPromise} from "../../helper/resolvable";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {TranslocoPipe} from "@ngneat/transloco";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {SmallBoxComponent} from "../../components/small-box/small-box.component";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {BoxComponent} from "../../components/box/box.component";
import {AsyncPipe, isPlatformBrowser} from "@angular/common";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {ReactiveFormsModule} from "@angular/forms";
import {AuthManagerService} from "../../services/auth-manager.service";
import {CopyButtonComponent} from "../../components/copy-button/copy-button.component";
import {FormatDatetimePipe} from "../../pipes/format-date.pipe";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {CurrentUserStatusComponent} from "../../components/horde/current-user-status/current-user-status.component";
import {HordeStatusComponent} from "../../components/horde/horde-status/horde-status.component";
import {WorkerDetailComponent} from "../../components/worker-detail/worker-detail.component";
import {YourWorkersComponent} from "../../components/horde/your-workers/your-workers.component";
import {TransferKudosComponent} from "../../components/horde/transfer-kudos/transfer-kudos.component";
import {SharedKeysComponent} from "../../components/horde/shared-keys/shared-keys.component";
import {AllWorkersComponent} from "../../components/horde/all-workers/all-workers.component";

@Component({
  selector: 'app-horde',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    TranslocoMarkupComponent,
    SmallBoxComponent,
    FormatNumberPipe,
    BoxComponent,
    YesNoComponent,
    PrintSecondsPipe,
    AsyncPipe,
    MathSqrtPipe,
    ReactiveFormsModule,
    CopyButtonComponent,
    FormatDatetimePipe,
    FaIconComponent,
    CurrentUserStatusComponent,
    HordeStatusComponent,
    WorkerDetailComponent,
    YourWorkersComponent,
    TransferKudosComponent,
    SharedKeysComponent,
    AllWorkersComponent
  ],
  templateUrl: './horde.component.html',
  styleUrl: './horde.component.scss'
})
export class HordeComponent implements OnInit {
  private readonly isBrowser: boolean;

  public loading = signal(true);

  private rawCurrentUser: WritableSignal<UserDetails | null> = signal(null);

  public isAnonymous = this.authManager.isAnonymous;
  public isSharedKey = computed(() => {
    if (this.isAnonymous()) {
      return false;
    }
    if (this.currentUser() === null) {
      return false;
    }
    return this.currentUser()!.username.toLowerCase().includes('shared key:');
  });

  public addedSharedKeys = signal<string[]>([]);
  public removedSharedKeys = signal<string[]>([]);

  public currentUser = computed(() => {
    if (this.rawCurrentUser() === null) {
      return null;
    }

    const newUser: UserDetails = {...this.rawCurrentUser()!};

    newUser.sharedkey_ids = [...(newUser.sharedkey_ids ?? []), ...this.addedSharedKeys()];
    newUser.sharedkey_ids = newUser.sharedkey_ids.filter(id => !this.removedSharedKeys().includes(id));
    newUser.sharedkey_ids = newUser.sharedkey_ids.filter((value, index) => newUser.sharedkey_ids!.indexOf(value) === index);

    return newUser;
  });

  constructor(
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    private readonly authManager: AuthManagerService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    await this.refreshCurrentUser();

    this.loading.set(false);
  }

  public async refreshCurrentUser() {
    const response = await toPromise(this.api.currentUser());
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {
        message: response.errorResponse!.message,
        code: response.errorResponse!.rc
      }));
      this.loading.set(false);
      return;
    }

    this.rawCurrentUser.set(response.successResponse!);
  }

  public async onSharedKeyRemoved(keyId: string): Promise<void> {
    this.removedSharedKeys.update(keys => [...keys, keyId]);
  }

  public async onSharedKeyCreated(keyId: string): Promise<void> {
    this.addedSharedKeys.update(keys => [...keys, keyId]);
  }
}
