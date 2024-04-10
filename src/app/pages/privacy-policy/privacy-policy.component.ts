import {Component} from '@angular/core';
import {TranslocoMarkupComponent} from "ngx-transloco-markup";

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [
    TranslocoMarkupComponent
  ],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent {

}
