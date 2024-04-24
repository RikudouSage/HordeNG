import {Pipe, PipeTransform} from '@angular/core';
import {map, Observable} from "rxjs";
import {CivitAiService} from "../services/civit-ai.service";

@Pipe({
  name: 'civitAiModelVersionId',
  standalone: true
})
export class CivitAiModelVersionIdPipe implements PipeTransform {

  constructor(
    private readonly civitAi: CivitAiService,
  ) {
  }

  transform(modelId: number): Observable<number> {
    return this.civitAi.getModelDetail(modelId).pipe(
      map (model => model.modelVersions[0].id),
    );
  }

}
