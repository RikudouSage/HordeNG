import {Component, computed, OnInit, signal} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AuthManagerService} from "../../services/auth-manager.service";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {LoaderComponent} from "../../components/loader/loader.component";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule,
    FaIconComponent,
    LoaderComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  private iconEyeOpen = signal(faEye);
  private iconEyeClosed = signal(faEyeSlash);
  public passwordVisible = signal(false);
  public passwordFieldIcon = computed(() => {
    if (this.passwordVisible()) {
      return this.iconEyeClosed();
    }

    return this.iconEyeOpen();
  });

  public loading = signal(true);

  public form = new FormGroup({
    apiKey: new FormControl<string>(this.authManager.anonymousApiKey, [Validators.required]),
  });

  constructor(
    private readonly authManager: AuthManagerService,
    private readonly horde: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    this.form.patchValue({
      apiKey: this.authManager.apiKey(),
    });
    this.loading.set(false);
  }

  public async togglePasswordVisibility(): Promise<void> {
    this.passwordVisible.update(visible => !visible);
  }


  public async submitForm(): Promise<void> {
    if (!this.form.valid) {
      await this.messageService.error(this.translator.get('app.error.form_invalid'));
      return;
    }
    this.loading.set(true);
    const previous = this.authManager.apiKey();
    this.authManager.apiKey = this.form.controls.apiKey.value!;
    const response = await toPromise(this.horde.currentUser());
    if (!response.success) {
      this.authManager.apiKey = previous;
      await this.messageService.error(this.translator.get('app.error.invalid_api_key'));
    } else {
      await this.messageService.success(this.translator.get('app.success.settings_form'));
    }

    this.loading.set(false);
  }
}
