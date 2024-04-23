import {Component, input} from '@angular/core';
import {GreatestCommonDivisorPipe} from "../../pipes/greatest-common-divisor.pipe";

@Component({
  selector: 'app-aspect-ratio',
  standalone: true,
  imports: [
    GreatestCommonDivisorPipe
  ],
  templateUrl: './aspect-ratio.component.html',
  styleUrl: './aspect-ratio.component.scss'
})
export class AspectRatioComponent {
  public first = input.required<number>();
  public second = input.required<number>();
}
