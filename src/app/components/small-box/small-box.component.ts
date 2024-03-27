import {Component, input, InputSignal, OnInit} from '@angular/core';
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";

@Component({
  selector: 'app-small-box',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  templateUrl: './small-box.component.html',
  styleUrl: './small-box.component.scss'
})
export class SmallBoxComponent implements OnInit {
  public title: InputSignal<string> = input.required();
  public color: InputSignal<string> = input.required();
  public icon: InputSignal<IconDefinition> = input.required();

  public async ngOnInit(): Promise<void> {
  }
}
