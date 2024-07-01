import {Component, input, OnInit, output} from '@angular/core';
import {TranslocoPipe} from "@jsverse/transloco";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {FormatNumberPipe} from "../../../../pipes/format-number.pipe";
import {TextualInversionInjectType} from "../../../../types/db/generation-options";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {ModalService} from "../../../../services/modal.service";

export interface ConfigureTextualInversionResult {
  inject: TextualInversionInjectType | null;
  strength: number | null;
}

@Component({
  selector: 'app-generate-image-configure-textual-inversion',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule,
    FormatNumberPipe,
    TranslocoMarkupComponent
  ],
  templateUrl: './configure-textual-inversion.component.html',
  styleUrl: './configure-textual-inversion.component.scss'
})
export class ConfigureTextualInversionComponent implements OnInit {
  public name = input.required<string>();
  public id = input.required<number>();
  public strength = input<number | undefined>(undefined);
  public inject = input<TextualInversionInjectType | undefined>(undefined);

  public configured = output<ConfigureTextualInversionResult>();

  public form = new FormGroup({
    inject: new FormControl<TextualInversionInjectType | null>(null),
    strength: new FormControl<number | null>(null),
  });

  constructor(
    private readonly modalService: ModalService,
  ) {
  }

  public async onFormSubmitted(): Promise<void> {
    let inject: TextualInversionInjectType | null = this.form.value.inject ?? null;
    if (<string>inject === 'null') {
      inject = null;
    }
    this.configured.emit({
      inject: inject,
      strength: this.form.value.strength ?? null,
    });
    await this.modalService.close();
  }

  public async ngOnInit(): Promise<void> {
    this.form.patchValue({
      inject: this.inject() ?? null,
      strength: this.strength() ?? null,
    });
  }
}
