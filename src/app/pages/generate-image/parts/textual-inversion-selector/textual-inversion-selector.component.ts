import {Component, computed, effect, input, OnInit, output, signal, TemplateRef} from '@angular/core';
import {CivitAiBaseModel} from "../../../../types/civit-ai/civit-ai-base-model";
import {CivitAiService} from "../../../../services/civit-ai.service";
import {DatabaseService} from "../../../../services/database.service";
import {ModalService} from "../../../../services/modal.service";
import {convertToCivitAiBase} from "../../../../helper/compare-model-bases";
import {ModelConfiguration} from "../../../../types/sd-repo/model-configuration";
import _ from 'lodash';
import {ModelSearchResponse} from "../../../../types/civit-ai/model-search-response";
import {toPromise} from "../../../../helper/resolvable";
import {catchError, of} from "rxjs";
import {CivitAiModel} from "../../../../types/civit-ai/civit-ai-model";
import {AsyncPipe, KeyValuePipe} from "@angular/common";
import {BoxComponent} from "../../../../components/box/box.component";
import {ConfigureLoraComponent} from "../../../../components/configure-lora/configure-lora.component";
import {LoaderComponent} from "../../../../components/loader/loader.component";
import {ModelBasesMatchWarningPipe} from "../../../../pipes/model-bases-match-warning.pipe";
import {ReactiveFormsModule} from "@angular/forms";
import {ToggleCheckboxComponent} from "../../../../components/toggle-checkbox/toggle-checkbox.component";
import {TomSelectDirective} from "../../../../directives/tom-select.directive";
import {TranslocoPipe} from "@jsverse/transloco";
import {TextualInversionGenerationOption} from "../../../../types/db/generation-options";
import {RouterLink} from "@angular/router";
import {
  ConfigureTextualInversionComponent,
  ConfigureTextualInversionResult
} from "../configure-textual-inversion/configure-textual-inversion.component";

interface TextualInversionSearchForm {
  query: string;
  nsfw: boolean;
  baseModels: CivitAiBaseModel[];
}

@Component({
  selector: 'app-generate-image-textual-inversion-selector',
  standalone: true,
  imports: [
    AsyncPipe,
    BoxComponent,
    ConfigureLoraComponent,
    KeyValuePipe,
    LoaderComponent,
    ModelBasesMatchWarningPipe,
    ReactiveFormsModule,
    ToggleCheckboxComponent,
    TomSelectDirective,
    TranslocoPipe,
    RouterLink,
    ConfigureTextualInversionComponent
  ],
  templateUrl: './textual-inversion-selector.component.html',
  styleUrl: './textual-inversion-selector.component.scss'
})
export class TextualInversionSelectorComponent implements OnInit {
  protected readonly CivitAiBaseModel = CivitAiBaseModel;
  protected readonly Number = Number;

  public query = signal('');
  public nsfw = signal(false);
  public baseModels = signal<CivitAiBaseModel[]>([]);

  private lastPageReached = signal(false);
  private cursors = signal<Array<null|string>>([null]);

  public selectedModel = input.required<ModelConfiguration>();
  public selectedTis = input.required<TextualInversionGenerationOption[]>();
  public selectedTiIds = computed(() => this.selectedTis().map(ti => ti.id));

  public loadingInitial = signal(true);
  public loading = signal(false);
  public items = signal<CivitAiModel[]>([]);

  public pages = signal<number[]>([1]);
  public currentPage = signal(1);
  public nextPageLinkEnabled = computed(() => this.currentPage() < Math.max(...this.pages()) || !this.lastPageReached());

  public versionBases = computed(() => {
    const result: {[version: number]: CivitAiBaseModel} = {};
    for (const item of this.items()) {
      for (const version of item.modelVersions) {
        result[version.id] = version.baseModel;
      }
    }

    return result;
  });

  public textualInversionSelected = output<TextualInversionGenerationOption>()

  constructor(
    private readonly civitAi: CivitAiService,
    private readonly database: DatabaseService,
    private readonly modalService: ModalService,
  ) {
    let previousFormValue: TextualInversionSearchForm | null = null;
    effect(() => {
      const newForm: TextualInversionSearchForm = {
        query: this.query(),
        baseModels: this.baseModels(),
        nsfw: this.nsfw(),
      };
      const oldForm = previousFormValue;
      previousFormValue = newForm;
      if (oldForm === null) {
        return;
      }

      if (_.isEqual(oldForm, newForm)) {
        return;
      }

      this.database.setSetting({
        setting: 'ti_search_form',
        value: newForm,
      });

      if (newForm.baseModels?.sort().join(',') !== convertToCivitAiBase(this.selectedModel().baseline).sort().join(',')) {
        this.database.setSetting({
          setting: 'lora_bases_modified',
          value: this.selectedModel().name,
        });
      }
    });
  }

  public async ngOnInit(): Promise<void> {
    const stored = (await this.database.getSetting<TextualInversionSearchForm>('ti_search_form', {
      query: '',
      nsfw: false,
      baseModels: [],
    })).value;
    this.query.set(stored.query);
    this.nsfw.set(stored.nsfw);
    this.baseModels.set(stored.baseModels);

    const modified = await this.database.getSetting<string>('lora_bases_modified');
    if (modified?.value !== this.selectedModel().name) {
      this.baseModels.set(convertToCivitAiBase(this.selectedModel().baseline));
    }

    await this.loadPage(1, null, true);
    this.loadingInitial.set(false);
  }

  // todo refactor to remove duplicates
  public async loadPage(page: number, event: Event | null = null, force: boolean = false): Promise<void> {
    event?.preventDefault();

    if (page === this.currentPage() && !force) {
      return;
    }
    this.currentPage.set(page);
    if (!this.pages().includes(page)) {
      this.pages.update(pages => [...pages, page]);
    }

    const response = await this.search();
    if (response === null) {
      return;
    }

    if (!response.metadata.nextCursor) {
      this.lastPageReached.set(true);
    }
  }

  public async search(): Promise<ModelSearchResponse | null> {
    this.loading.set(true);
    const value: TextualInversionSearchForm = {
      query: this.query(),
      baseModels: this.baseModels(),
      nsfw: this.nsfw(),
    };
    const result = await toPromise(this.civitAi.searchTextualInversions({
      query: value.query!,
      nsfw: value.nsfw!,
      baseModels: value.baseModels ?? [],
      nextPageCursor: this.cursors()[this.pages().indexOf(this.currentPage())] ?? undefined,
    }));
    this.items.set(result.items);
    if (this.cursors().length < this.pages().length + 1) {
      this.cursors.update(cursors => [...cursors, result.metadata.nextCursor ?? null]);
    }

    const numberRegex = /[0-9]+/;
    if (numberRegex.test(value.query!)) {
      const models = await Promise.all([
        toPromise(this.civitAi.getModelByVersion(Number(value.query!)).pipe(
          catchError(() => of(null)),
        )),
        toPromise(this.civitAi.getModelDetail(Number(value.query!)).pipe(
          catchError(() => of(null)),
        )),
      ]);

      const validModels = <CivitAiModel[]>models.filter(model => model !== null);
      this.items.update(items => [...items.concat(validModels)]);
    }

    const modelUrlRegex = /https:\/\/civitai\.com\/models\/([0-9]+)/;
    if (modelUrlRegex.test(value.query!)) {
      const id = value.query!.match(modelUrlRegex)?.[1] ?? null;
      if (id !== null) {
        const model = await toPromise(this.civitAi.getModelDetail(Number(id)).pipe(
          catchError(() => of(null)),
        ));
        if (model !== null) {
          this.items.update(items => [...items.concat([model])]);
        }
      }
    }

    this.loading.set(false);

    return result;
  }

  public async submitForm(event: Event) {
    event.preventDefault();

    this.lastPageReached.set(false);
    this.cursors.set([null]);
    this.pages.set([1]);
    this.currentPage.set(1);
    await this.search();
  }

  public async selectTi(modal: TemplateRef<any>) {
    this.modalService.open(modal);
  }

  public async updateBaseModels(select: HTMLSelectElement) {
    const options: NodeListOf<HTMLOptionElement> = select.querySelectorAll('option:checked');
    this.baseModels.set(Array.from(options).map(option => <CivitAiBaseModel>option.value));
  }

  public async onConfigured(textualInversion: CivitAiModel, result: ConfigureTextualInversionResult) {
    this.textualInversionSelected.emit({
      id: textualInversion.id,
      inject: result.inject ?? undefined,
      strength: result.strength ?? undefined,
    });
    await this.modalService.close();
  }
}
