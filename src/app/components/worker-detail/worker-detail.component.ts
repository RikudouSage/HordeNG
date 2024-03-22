import {Component, input} from '@angular/core';
import {WorkerDetails} from "../../types/horde/worker-details";
import {WorkerType} from "../../types/horde/worker-type";
import {BoxComponent} from "../box/box.component";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {TranslocoPipe} from "@ngneat/transloco";
import {YesNoComponent} from "../yes-no/yes-no.component";
import {MathSqrtPipe} from "../../pipes/math-sqrt.pipe";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {AsyncPipe} from "@angular/common";

@Component({
  selector: 'app-worker-detail',
  standalone: true,
  imports: [
    BoxComponent,
    FormatNumberPipe,
    TranslocoPipe,
    YesNoComponent,
    MathSqrtPipe,
    PrintSecondsPipe,
    AsyncPipe
  ],
  templateUrl: './worker-detail.component.html',
  styleUrl: './worker-detail.component.scss'
})
export class WorkerDetailComponent {
  protected readonly WorkerType = WorkerType;

  public worker = input.required<WorkerDetails>()
  public collapsible = input(false);
  public collapsedByDefault = input(false);
}