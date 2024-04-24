import {Pipe, PipeTransform} from '@angular/core';
import {map, Observable} from "rxjs";
import {CivitAiService} from "../services/civit-ai.service";

@Pipe({
  name: 'civitAiModelId',
  standalone: true
})
export class CivitAiModelIdPipe implements PipeTransform {
  constructor(
    private readonly civitAi: CivitAiService,
  ) {
  }

  transform(versionId: number): Observable<number> {
    return this.civitAi.getModelByVersion(versionId).pipe(
      map (lora => lora.id),
    );
  }

}
