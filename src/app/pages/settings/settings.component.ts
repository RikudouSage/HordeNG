import { Component } from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {AuthManagerService} from "../../services/auth-manager.service";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  public form = new FormGroup({
    apiKey: new FormControl<string>(this.authManager.anonymousApiKey),
  });

  constructor(
    private readonly authManager: AuthManagerService,
  ) {
  }
}
