import {Component, input} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'app-generate-image-configure-textual-inversion',
  standalone: true,
  imports: [
    TranslocoPipe,
    ReactiveFormsModule
  ],
  templateUrl: './configure-textual-inversion.component.html',
  styleUrl: './configure-textual-inversion.component.scss'
})
export class ConfigureTextualInversionComponent {
  public name = input.required<string>();
  public id = input.required<number>();
  public strength = input<number | undefined>(undefined);
  public inject = input<'prompt' | 'negative' | undefined>(undefined);

  public form = new FormGroup({
    inject: new FormControl<'prompt' | 'negative' | null>(this.inject() ?? null),
    strength: new FormControl<number | null>(this.strength() ?? null),
  });

  public async onFormSubmitted(): Promise<void> {

  }
}
