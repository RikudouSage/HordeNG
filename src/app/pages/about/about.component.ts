import { Component } from '@angular/core';
import {TranslocoMarkupComponent} from "ngx-transloco-markup";

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    TranslocoMarkupComponent
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {

}
