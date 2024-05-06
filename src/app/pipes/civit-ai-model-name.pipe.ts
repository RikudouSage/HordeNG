import {Pipe, PipeTransform} from '@angular/core';
import {map, Observable, of, switchMap} from "rxjs";
import {CivitAiService} from "../services/civit-ai.service";

@Pipe({
  name: 'civitAiModelName',
  standalone: true
})
export class CivitAiModelNamePipe implements PipeTransform {
  constructor(
    private readonly civitAi: CivitAiService,
  ) {
  }

  public transform(id: number, isVersionId: boolean): Observable<string> {
    return of(isVersionId).pipe(
      switchMap(isVersionId => {
        return isVersionId ? this.civitAi.getModelByVersion(id) : this.civitAi.getModelDetail(id);
      }),
      map(lora => lora.name),
    );
  }

}
