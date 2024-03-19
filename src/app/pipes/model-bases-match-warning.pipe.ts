import {Pipe, PipeTransform} from '@angular/core';
import {CivitAiBaseModel} from "../types/civit-ai/civit-ai-base-model";
import {BaselineModel} from "../types/sd-repo/baseline-model";
import {doModelBasesMatch} from "../helper/compare-model-bases";
import {Observable} from "rxjs";
import {TranslatorService} from "../services/translator.service";

@Pipe({
  name: 'modelBasesMatchWarning',
  standalone: true
})
export class ModelBasesMatchWarningPipe implements PipeTransform {

  constructor(
    private readonly translator: TranslatorService,
  ) {
  }

  transform(model: CivitAiBaseModel, compareTo: BaselineModel): Observable<string> | null {
    if (!doModelBasesMatch(compareTo, model)) {
      return this.translator.get('app.warning.model_bases_match', {provided: model, expected: compareTo});
    }

    return null;
  }

}
