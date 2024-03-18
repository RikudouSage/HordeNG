import {Component, input} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";


@Component({
  selector: 'app-effective-value',
  standalone: true,
  imports: [
    TranslocoPipe
  ],
  templateUrl: './effective-value.component.html',
  styleUrl: './effective-value.component.scss'
})
export class EffectiveValueComponent {
  public value = input.required<any>();
  public original = input.required<any>();
}
