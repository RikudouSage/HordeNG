import {Component, computed, input, OnInit, output, signal} from '@angular/core';
import {HordeRepoDataService} from "../../services/horde-repo-data.service";
import {EnrichedPromptStyle} from "../../types/sd-repo/prompt-style";
import {toPromise} from "../../helper/resolvable";
import {LoaderComponent} from "../loader/loader.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {BoxComponent} from "../box/box.component";
import {PromptStyleTextComponent} from "../prompt-style-text/prompt-style-text.component";
import {ModalService} from "../../services/modal.service";

@Component({
  selector: 'app-prompt-style-modal',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    BoxComponent,
    PromptStyleTextComponent
  ],
  templateUrl: './prompt-style-modal.component.html',
  styleUrl: './prompt-style-modal.component.scss'
})
export class PromptStyleModalComponent implements OnInit {
  public originalPrompt = input.required<string>();
  public originalNegativePrompt = input.required<string | null>();

  public styles = signal<EnrichedPromptStyle[]>([]);
  public categories = computed(() => {
    const categories = this.styles().map(style => style.category);
    return categories.filter((value, index) => categories.indexOf(value) === index);
  });
  public stylesByCategory = computed(() => {
    const result: {[category: string]: EnrichedPromptStyle[]} = {};
    for (const style of this.styles()) {
      result[style.category ?? 'no category'] ??= [];
      result[style.category ?? 'no category'].push(style);
    }

    return result;
  });
  public collapsed = signal<{[style:string]: boolean | undefined}>({});
  public loading = signal(true);

  public styleChosen = output<EnrichedPromptStyle>();

  constructor(
    private readonly repoData: HordeRepoDataService,
    private readonly modalService: ModalService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    this.styles.set(await toPromise(this.repoData.getStyles()));
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
}
