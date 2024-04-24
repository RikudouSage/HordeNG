import {Component, Directive, input, signal, TemplateRef} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {TooltipComponent} from "../../../../components/tooltip/tooltip.component";
import {TextualInversionGenerationOption} from "../../../../types/db/generation-options";
import {LoraTextRowComponent} from "../../../../components/lora-text-row/lora-text-row.component";
import {AsyncPipe, JsonPipe, NgTemplateOutlet} from "@angular/common";
import {CivitAiModelNamePipe} from "../../../../pipes/civit-ai-model-name.pipe";
import {FormatNumberPipe} from "../../../../pipes/format-number.pipe";
import {CivitAiModelIdPipe} from "../../../../pipes/civit-ai-model-id.pipe";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faExternalLink, faPencil, faRemove} from "@fortawesome/free-solid-svg-icons";
import {ModalService} from "../../../../services/modal.service";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ConfigureTextualInversionComponent} from "../configure-textual-inversion/configure-textual-inversion.component";

@Directive({
  selector: 'ng-template[textual-inversion]',
  standalone: true,
})
export class TextualInversionsNgTemplate {
  static ngTemplateContextGuard(
    directive: TextualInversionsNgTemplate,
    context: unknown
  ): context is {textualInversion: TextualInversionGenerationOption, comma?: boolean} {
    return true;
  }
}

@Directive({
  selector: 'ng-template[configure-textual-inversion]',
  standalone: true,
})
export class ConfigureTextualInversionsNgTemplate {
  static ngTemplateContextGuard(
    directive: ConfigureTextualInversionsNgTemplate,
    context: unknown
  ): context is {name: string, id: number, strength?: number, inject?: 'prompt' | 'negative'} {
    return true;
  }
}

@Component({
  selector: 'app-generate-image-textual-inversions',
  standalone: true,
  imports: [
    TranslocoPipe,
    TooltipComponent,
    LoraTextRowComponent,
    NgTemplateOutlet,
    JsonPipe,
    TextualInversionsNgTemplate,
    CivitAiModelNamePipe,
    AsyncPipe,
    FormatNumberPipe,
    CivitAiModelIdPipe,
    FaIconComponent,
    ConfigureTextualInversionsNgTemplate,
    FormsModule,
    ReactiveFormsModule,
    ConfigureTextualInversionComponent
  ],
  templateUrl: './textual-inversions.component.html',
  styleUrl: './textual-inversions.component.scss'
})
export class TextualInversionsComponent {
  public modifiedOptions = input.required<TextualInversionGenerationOption[] | null>();
  public selectedTis = signal<TextualInversionGenerationOption[]>([{
    id: 369342,
    inject: "prompt",
    strength: 1
  }]);
  public iconExternalLink = signal(faExternalLink);
  public iconEdit = signal(faPencil);
  public iconDelete = signal(faRemove);

  constructor(
    private readonly modalService: ModalService,
  ) {
  }

  public async openModal(modal: TemplateRef<any>): Promise<void> {
    this.modalService.open(modal);
  }

  public async removeTextualInversion(id: number): Promise<void> {
    this.selectedTis.update(tis => [...tis.filter(ti => ti.id !== id)]);
  }
}
