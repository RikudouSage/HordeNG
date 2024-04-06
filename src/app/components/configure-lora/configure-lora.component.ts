import {Component, input, OnInit, output} from '@angular/core';
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
export class ConfigureLoraComponent implements OnInit {
  public loraName = input.required<string>();
  public versionId = input.required<number>();

  public modelStrength = input(1);
  public clipStrength = input(1);

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

  public async ngOnInit(): Promise<void> {
    this.form.patchValue({
      model: this.modelStrength(),
      clip: this.clipStrength(),
    });
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
