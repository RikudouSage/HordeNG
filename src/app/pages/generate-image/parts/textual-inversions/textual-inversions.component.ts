import {Component, Directive, effect, input, OnInit, output, signal, TemplateRef} from '@angular/core';
import {TranslocoPipe} from "@ngneat/transloco";
import {TooltipComponent} from "../../../../components/tooltip/tooltip.component";
import {TextualInversionGenerationOption} from "../../../../types/db/generation-options";
import {LoraTextRowComponent} from "../../../../components/lora-text-row/lora-text-row.component";
import {AsyncPipe, JsonPipe, KeyValuePipe, NgTemplateOutlet} from "@angular/common";
import {CivitAiModelNamePipe} from "../../../../pipes/civit-ai-model-name.pipe";
import {FormatNumberPipe} from "../../../../pipes/format-number.pipe";
import {CivitAiModelIdPipe} from "../../../../pipes/civit-ai-model-id.pipe";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faExternalLink, faPencil, faRemove} from "@fortawesome/free-solid-svg-icons";
import {ModalService} from "../../../../services/modal.service";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {
  ConfigureTextualInversionComponent,
  ConfigureTextualInversionResult
} from "../configure-textual-inversion/configure-textual-inversion.component";
import {ModelConfiguration} from "../../../../types/sd-repo/model-configuration";
import {ToggleCheckboxComponent} from "../../../../components/toggle-checkbox/toggle-checkbox.component";
import {TomSelectDirective} from "../../../../directives/tom-select.directive";

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
    FormsModule,
    ReactiveFormsModule,
    ConfigureTextualInversionComponent,
    KeyValuePipe,
    ToggleCheckboxComponent,
    TomSelectDirective
  ],
  templateUrl: './textual-inversions.component.html',
  styleUrl: './textual-inversions.component.scss'
})
export class TextualInversionsComponent implements OnInit {
  public modifiedOptions = input.required<TextualInversionGenerationOption[] | null>();
  public currentModel = input.required<ModelConfiguration>();
  public initialTis = input<TextualInversionGenerationOption[]>();

  public selectedTis = signal<TextualInversionGenerationOption[]>([]);
  public iconExternalLink = signal(faExternalLink);
  public iconEdit = signal(faPencil);
  public iconDelete = signal(faRemove);

  public selectedTisUpdated = output<TextualInversionGenerationOption[]>();

  constructor(
    private readonly modalService: ModalService,
  ) {
    let initialized = false;
    effect(() => {
      const tis = this.selectedTis();
      if (!initialized) {
        initialized = true;
        return;
      }
      this.selectedTisUpdated.emit(tis);
    });
  }

  public async ngOnInit(): Promise<void> {
    if (this.initialTis()?.length) {
      this.selectedTis.set(this.initialTis()!);
    }
  }

  public async openModal(modal: TemplateRef<any>): Promise<void> {
    this.modalService.open(modal);
  }

  public async removeTextualInversion(id: number): Promise<void> {
    this.selectedTis.update(tis => [...tis.filter(ti => ti.id !== id)]);
  }

  public async onConfigured(target: TextualInversionGenerationOption, configuration: ConfigureTextualInversionResult): Promise<void> {
    this.selectedTis.update(tis => {
      const result: TextualInversionGenerationOption[] = [];
      for (const ti of tis) {
        if (ti.id === target.id) {
          const newTi: TextualInversionGenerationOption = {
            id: target.id,
          };
          if (configuration.strength !== null) {
            newTi.strength = configuration.strength;
          }
          if (configuration.inject !== null) {
            newTi.inject = configuration.inject;
          }
          result.push(newTi);
        } else {
          result.push({...ti});
        }
      }

      return result;
    });
    await this.modalService.close();
  }
}
