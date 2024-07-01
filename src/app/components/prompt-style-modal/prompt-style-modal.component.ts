import {Component, computed, input, OnInit, output, signal} from '@angular/core';
import {HordeRepoDataService} from "../../services/horde-repo-data.service";
import {EnrichedPromptStyle} from "../../types/sd-repo/prompt-style";
import {toPromise} from "../../helper/resolvable";
import {LoaderComponent} from "../loader/loader.component";
import {TranslocoPipe} from "@jsverse/transloco";
import {BoxComponent} from "../box/box.component";
import {PromptStyleTextComponent} from "../prompt-style-text/prompt-style-text.component";
import {ModalService} from "../../services/modal.service";
import {CivitAiModelNamePipe} from "../../pipes/civit-ai-model-name.pipe";
import {AsyncPipe, NgOptimizedImage} from "@angular/common";
import {CivitAiService} from "../../services/civit-ai.service";
import {catchError, map, Observable, of, tap} from "rxjs";
import {CivitAiModel} from "../../types/civit-ai/civit-ai-model";
import {TranslatorService} from "../../services/translator.service";
import {DebounceInputDirective} from "../../directives/debounce-input.directive";
import {CacheableImageComponent} from "../cacheable-image/cacheable-image.component";

@Component({
  selector: 'app-prompt-style-modal',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    BoxComponent,
    PromptStyleTextComponent,
    CivitAiModelNamePipe,
    AsyncPipe,
    DebounceInputDirective,
    NgOptimizedImage,
    CacheableImageComponent
  ],
  templateUrl: './prompt-style-modal.component.html',
  styleUrl: './prompt-style-modal.component.scss'
})
export class PromptStyleModalComponent implements OnInit {
  private loraNameCache: Record<string, CivitAiModel> = {};
  private rawStyles = signal<EnrichedPromptStyle[]>([]);
  private filteredStyles = computed(() => {
    return this.rawStyles().filter(style => style.name.toLowerCase().startsWith(this.currentFilter().toLowerCase()));
  });

  public originalPrompt = input.required<string>();
  public originalNegativePrompt = input.required<string | null>();

  public categories = computed(() => {
    const categories = this.filteredStyles().map(style => style.category);
    return categories.filter((value, index) => categories.indexOf(value) === index);
  });
  public stylesByCategory = computed(() => {
    const result: {[category: string]: EnrichedPromptStyle[]} = {};
    for (const style of this.filteredStyles()) {
      result[style.category ?? 'no category'] ??= [];
      result[style.category ?? 'no category'].push(style);
    }

    return result;
  });
  public collapsed = signal<{[style:string]: boolean | undefined}>({});
  public loading = signal(true);

  public loraNames = signal<Record<string, string[] | undefined>>({});

  public currentFilter = signal('');

  public styleChosen = output<EnrichedPromptStyle>();

  constructor(
    private readonly repoData: HordeRepoDataService,
    private readonly modalService: ModalService,
    private readonly civitAi: CivitAiService,
    private readonly translator: TranslatorService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    this.rawStyles.set(await toPromise(this.repoData.getStyles()));
    this.loading.set(false);
  }

  public async toggleCollapsed(style: EnrichedPromptStyle): Promise<void> {
    this.collapsed.update(collapsed => {
      collapsed[style.name] = !(collapsed[style.name] ?? true);
      return collapsed;
    });
  }

  public async useStyle(style: EnrichedPromptStyle): Promise<void> {
    this.styleChosen.emit(style);
    await this.modalService.close();
  }

  public async loadLoraNames(style: EnrichedPromptStyle) {
    const promises: Promise<string>[] = [];
    for (const lora of (style.loras ?? [])) {
      let observable: Observable<CivitAiModel>;
      const cacheKey = lora.name + String(lora.is_version ?? false);
      if (this.loraNameCache[cacheKey]) {
        observable = of(this.loraNameCache[cacheKey]);
      } else {
        if (lora.is_version) {
          observable = this.civitAi.getModelByVersion(Number(lora.name));
        } else {
          observable = this.civitAi.getModelDetail(Number(lora.name));
        }
        observable = observable.pipe(
          tap (lora => this.loraNameCache[cacheKey] = lora),
        );
      }

      promises.push(toPromise(observable.pipe(
        map (lora => lora.name),
        catchError(() => this.translator.get('app.lora.unknown')),
      )));
    }

    const result = await Promise.all(promises);
    this.loraNames.update(loraNames => {
      loraNames[style.name] = result;

      return {...loraNames};
    });
  }
}
