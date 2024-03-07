import {Component, OnInit, signal, WritableSignal} from '@angular/core';
import {LoaderComponent} from "../../components/loader/loader.component";
import {AiHorde} from "../../services/ai-horde.service";
import {UserDetails} from "../../types/horde/user-details";
import {toPromise} from "../../helper/resolvable";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {TranslocoPipe} from "@ngneat/transloco";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";

@Component({
  selector: 'app-horde',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    TranslocoMarkupComponent
  ],
  templateUrl: './horde.component.html',
  styleUrl: './horde.component.scss'
})
export class HordeComponent implements OnInit {
  public loading = signal(true);
  public currentUser: WritableSignal<UserDetails | null> = signal(null);

  constructor(
    private readonly horde: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    const response = await toPromise(this.horde.currentUser());
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
      this.loading.set(false);
      return;
    }

    this.currentUser.set(response.successResponse!);
    this.loading.set(false);
  }
}
