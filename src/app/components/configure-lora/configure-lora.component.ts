import {Component, input, output} from '@angular/core';
import {CivitAiModel} from "../../types/civit-ai/civit-ai-model";
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {ModalService} from "../../services/modal.service";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";

export interface ConfigureLoraResult {
  versionId: number;
  model: number;
  clip: number;
}

@Component({
  selector: 'app-configure-lora',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule,
    FormatNumberPipe
  ],
  templateUrl: './configure-lora.component.html',
  styleUrl: './configure-lora.component.scss'
})
export class ConfigureLoraComponent {
  public lora = input.required<CivitAiModel>();
  public versionId = input.required<number>();

  public configured = output<ConfigureLoraResult>();

  public form = new FormGroup({
    model: new FormControl<number>(1, [
      Validators.min(-5),
      Validators.max(5),
    ]),
    clip: new FormControl<number>(1, [
      Validators.min(-5),
      Validators.max(5),
    ]),
  });

  constructor(
    private readonly modalService: ModalService,
  ) {
  }

  public async onFormSubmitted(): Promise<void> {
    if (!this.form.valid) {
      return;
    }

    this.configured.emit({
      versionId: this.versionId(),
      clip: this.form.value.clip!,
      model: this.form.value.model!,
    });

    await this.modalService.close();
  }
}
