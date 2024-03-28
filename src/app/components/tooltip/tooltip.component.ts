import {Component, input, signal} from '@angular/core';
import {faCircleInfo} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {NgxTippyModule} from "ngx-tippy-wrapper";

@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [
    FaIconComponent,
    NgxTippyModule
  ],
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  public text = input.required<string>();
  public icon = signal(faCircleInfo);
}
