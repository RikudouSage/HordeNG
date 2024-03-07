import {Component, computed, signal} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {AuthManagerService} from "../../services/auth-manager.service";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule,
    FaIconComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private iconEyeOpen = signal(faEye);
  private iconEyeClosed = signal(faEyeSlash);
  public passwordVisible = signal(false);
  public passwordFieldIcon = computed(() => {
    if (this.passwordVisible()) {
      return this.iconEyeClosed();
    }

    return this.iconEyeOpen();
  });

  public form = new FormGroup({
    apiKey: new FormControl<string>(this.authManager.anonymousApiKey),
  });

  constructor(
    private readonly authManager: AuthManagerService,
  ) {
  }

  public async togglePasswordVisibility(): Promise<void> {
    this.passwordVisible.update(visible => !visible);
  }
}
