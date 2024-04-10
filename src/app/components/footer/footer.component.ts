import {Component} from '@angular/core';
import {RouterLink} from "@angular/router";
import {TranslocoPipe} from "@ngneat/transloco";

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterLink,
    TranslocoPipe
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {

}
