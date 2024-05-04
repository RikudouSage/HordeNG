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
import {catchError, of, pairwise, startWith} from "rxjs";
import {RouterLink} from "@angular/router";
import {ModelSearchResponse} from "../../types/civit-ai/model-search-response";
import _ from 'lodash';

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
    RouterLink,
  ],
  templateUrl: './lora-selector.component.html',
  styleUrl: './lora-selector.component.scss'
})
export class LoraSelectorComponent implements OnInit {
  protected readonly Number = Number;
  protected readonly CivitAiBaseModel = CivitAiBaseModel;

  private lastPageReached = signal(false);
  private cursors = signal<Array<null|string>>([null]);

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

  public pages = signal<number[]>([1]);
  public currentPage = signal(1);
  public nextPageLinkEnabled = computed(() => this.currentPage() < Math.max(...this.pages()) || !this.lastPageReached());

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

    this.form.valueChanges.pipe(
      startWith(this.form.value),
      pairwise(),
    ).subscribe(changeSet => {
      const [old, changes] = changeSet;
      if (_.isEqual(old, changes)) {
        return;
      }
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

    await this.loadPage(1, null, true);
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

  public async search(): Promise<ModelSearchResponse | null> {
    if (!this.form.valid) {
      return null;
    }
    this.loading.set(true);
    const value = this.form.value;
    const result = await toPromise(this.civitAi.searchLora({
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

  public async submitForm() {
    this.lastPageReached.set(false);
    this.cursors.set([null]);
    this.pages.set([1]);
    this.currentPage.set(1);
    await this.search();
  }
}
