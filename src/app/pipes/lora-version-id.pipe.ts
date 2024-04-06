import {Pipe, PipeTransform} from '@angular/core';
import {map, Observable} from "rxjs";
import {CivitAiService} from "../services/civit-ai.service";

@Pipe({
  name: 'loraVersionId',
  standalone: true
})
export class LoraVersionIdPipe implements PipeTransform {

  constructor(
    private readonly civitAi: CivitAiService,
  ) {
  }

  transform(modelId: number): Observable<number> {
    return this.civitAi.getLoraDetail(modelId).pipe(
      map (model => model.modelVersions[0].id),
    );
  }

}
