import {Component, input} from '@angular/core';
import {AsyncPipe} from "@angular/common";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {LoraNamePipe} from "../../pipes/lora-name.pipe";
import {TranslocoPipe} from "@ngneat/transloco";
import {LoraGenerationOption} from "../../types/db/generation-options";

@Component({
  selector: 'app-lora-text-row',
  standalone: true,
  imports: [
    AsyncPipe,
    FormatNumberPipe,
    LoraNamePipe,
    TranslocoPipe
  ],
  templateUrl: './lora-text-row.component.html',
  styleUrl: './lora-text-row.component.scss'
})
export class LoraTextRowComponent {
  public lora = input.required<LoraGenerationOption>();
  public comma = input(false);
}
