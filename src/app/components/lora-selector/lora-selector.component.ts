import {Component, computed, input, OnInit, output, signal, TemplateRef} from '@angular/core';
import {LoraGenerationOption} from "../../types/db/generation-options";
import {LoaderComponent} from "../loader/loader.component";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {CivitAiService} from "../../services/civit-ai.service";
import {CivitAiModel} from "../../types/civit-ai/civit-ai-model";
import {DatabaseService} from "../../services/database.service";
import {toPromise} from "../../helper/resolvable";
import {TranslocoPipe} from "@ngneat/transloco";
import {ToggleCheckboxComponent} from "../toggle-checkbox/toggle-checkbox.component";
import {BoxComponent} from "../box/box.component";
import {TomSelectDirective} from "../../directives/tom-select.directive";
import {ModelConfiguration} from "../../types/sd-repo/model-configuration";
import {ModelBasesMatchWarningPipe} from "../../pipes/model-bases-match-warning.pipe";
import {AsyncPipe, KeyValuePipe} from "@angular/common";
import {CivitAiBaseModel} from "../../types/civit-ai/civit-ai-base-model";
import {ModalService} from "../../services/modal.service";
import {ConfigureLoraComponent, ConfigureLoraResult} from "../configure-lora/configure-lora.component";
import {convertToCivitAiBase} from "../../helper/compare-model-bases";

interface LoraSearchForm {
  query: string;
  nsfw: boolean;
  baseModels: CivitAiBaseModel[];
}

@Component({
  selector: 'app-lora-selector',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    ReactiveFormsModule,
    ToggleCheckboxComponent,
    BoxComponent,
    TomSelectDirective,
    ModelBasesMatchWarningPipe,
    AsyncPipe,
    ConfigureLoraComponent,
    KeyValuePipe,
  ],
  templateUrl: './lora-selector.component.html',
  styleUrl: './lora-selector.component.scss'
})
export class LoraSelectorComponent implements OnInit {
  protected readonly Number = Number;
  protected readonly CivitAiBaseModel = CivitAiBaseModel;

  public selectedLoras = input.required<LoraGenerationOption[]>();
  public selectedModel = input.required<ModelConfiguration>();
  public selectedLoraIds = computed(() => this.selectedLoras().map(lora => lora.id));

  public loadingInitial = signal(true);
  public loading = signal(false);
  public items = signal<CivitAiModel[]>([]);

  public versionBases = computed(() => {
    const result: {[version: number]: CivitAiBaseModel} = {};
    for (const item of this.items()) {
      for (const version of item.modelVersions) {
        result[version.id] = version.baseModel;
      }
    }

    return result;
  });

  public loraSelected = output<LoraGenerationOption>();

  public form = new FormGroup({
    query: new FormControl<string>(''),
    nsfw: new FormControl<boolean>(false),
    baseModels: new FormControl<CivitAiBaseModel[]>([]),
  });

  constructor(
    private readonly civitAi: CivitAiService,
    private readonly database: DatabaseService,
    private readonly modalService: ModalService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    this.form.patchValue((await this.database.getSetting<LoraSearchForm>('lora_search_form', {
      query: '',
      nsfw: false,
      baseModels: [],
    })).value);

    const modified = await this.database.getSetting<string>('lora_bases_modified');
    if (modified?.value !== this.selectedModel().name) {
      this.form.patchValue({
        baseModels: convertToCivitAiBase(this.selectedModel().baseline),
      });
    }

    this.form.valueChanges.subscribe(changes => {
      this.database.setSetting({
        setting: 'lora_search_form',
        value: changes,
      });
      if (changes.baseModels?.sort().join(',') !== convertToCivitAiBase(this.selectedModel().baseline).sort().join(',')) {
        this.database.setSetting({
          setting: 'lora_bases_modified',
          value: this.selectedModel().name,
        });
      }
    });
    await this.search();
    this.loadingInitial.set(false);
  }

  public async selectLora(modal: TemplateRef<any>): Promise<void> {
    this.modalService.open(modal);
  }

  public async onConfigured(config: ConfigureLoraResult) {
    this.loraSelected.emit({
      id: config.versionId,
      isVersionId: true,
      strengthClip: config.clip,
      strengthModel: config.model,
    });
  }

  public async search() {
    if (!this.form.valid) {
      return;
    }
    this.loading.set(true);
    const value = this.form.value;
    const result = await toPromise(this.civitAi.searchLora({
      query: value.query!,
      nsfw: value.nsfw!,
      baseModels: value.baseModels ?? [],
    }));
    this.items.set(result.items);
    this.loading.set(false);
  }
}
