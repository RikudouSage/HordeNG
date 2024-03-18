import {Component, signal} from '@angular/core';
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {environment} from "../../../environments/environment";
import {TranslocoPipe} from "@ngneat/transloco";

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    TranslocoMarkupComponent,
    TranslocoPipe
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  public version = signal(environment.appVersion);
}
