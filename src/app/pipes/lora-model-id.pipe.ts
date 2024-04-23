import {Pipe, PipeTransform} from '@angular/core';
import {map, Observable} from "rxjs";
import {CivitAiService} from "../services/civit-ai.service";

@Pipe({
  name: 'loraModelId',
  standalone: true
})
export class LoraModelIdPipe implements PipeTransform {
  constructor(
    private readonly civitAi: CivitAiService,
  ) {
  }

  transform(versionId: number): Observable<number> {
    return this.civitAi.getLoraByVersion(versionId).pipe(
      map (lora => lora.id),
    );
  }

}
