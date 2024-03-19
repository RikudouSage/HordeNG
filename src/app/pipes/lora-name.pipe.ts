import { Pipe, PipeTransform } from '@angular/core';
import {map, Observable, of, switchMap} from "rxjs";
import {CivitAiService} from "../services/civit-ai.service";

@Pipe({
  name: 'loraName',
  standalone: true
})
export class LoraNamePipe implements PipeTransform {
  constructor(
    private readonly civitAi: CivitAiService,
  ) {
  }

  public transform(id: number, isVersionId: boolean): Observable<string> {
    return of(isVersionId).pipe(
      switchMap(isVersionId => {
        return isVersionId ? this.civitAi.getLoraByVersion(id) : this.civitAi.getLoraDetail(id);
      }),
      map(lora => lora.name),
    );
  }

}
