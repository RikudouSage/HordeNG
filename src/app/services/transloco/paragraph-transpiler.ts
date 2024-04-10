import {BlockTranspiler, TranslationMarkupRenderer, TranslationMarkupRendererFactory} from "ngx-transloco-markup";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class ParagraphTranspiler extends BlockTranspiler {
  constructor(
    private readonly rendererFactory: TranslationMarkupRendererFactory,
  ) {
    super('[p]', '[/p]');
  }
  protected createRenderer(childRenderers: TranslationMarkupRenderer[]): TranslationMarkupRenderer {
    return this.rendererFactory.createElementRenderer('p', childRenderers);
  }
}
