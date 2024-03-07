import {Component, input, InputSignal} from '@angular/core';

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [],
  templateUrl: './box.component.html',
  styleUrl: './box.component.scss'
})
export class BoxComponent {
  public title: InputSignal<string> = input.required();
}
