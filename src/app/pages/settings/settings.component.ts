import {Component, computed, OnInit, signal} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AuthManagerService} from "../../services/auth-manager.service";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {LoaderComponent} from "../../components/loader/loader.component";

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
      return;
    }
    this.loading.set(true);
    const previous = this.authManager.apiKey();
    this.authManager.apiKey = this.form.controls.apiKey.value!;
    const response = await toPromise(this.horde.currentUser());
    if (!response.success) {
      this.authManager.apiKey = previous;
      // todo show message
    }

    this.loading.set(false);
  }
}
