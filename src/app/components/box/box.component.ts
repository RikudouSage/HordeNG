import {Component, input, InputSignal, OnInit} from '@angular/core';
import {Resolvable} from "../../helper/resolvable";
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  templateUrl: './box.component.html',
  styleUrl: './box.component.scss'
})
export class BoxComponent implements OnInit {
  public title: InputSignal<string> = input.required();
  public color: InputSignal<string> = input.required();
  public icon: InputSignal<IconDefinition> = input.required();

  public async ngOnInit(): Promise<void> {
  }
}
