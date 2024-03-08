import { Pipe, PipeTransform } from '@angular/core';
import {Observable} from "rxjs";
import {TranslatorService} from "../services/translator.service";
import {toPromise} from "../helper/resolvable";

@Pipe({
  name: 'printSeconds',
  standalone: true
})
export class PrintSecondsPipe implements PipeTransform {
  constructor(
    private readonly translator: TranslatorService,
  ) {
  }

  async transform(value: number): Promise<string> {
    const days = Math.floor(value / 86_400);
    let remainder = value - (days * 86_400);

    const hours = Math.floor(remainder / 3600);
    remainder = remainder - (hours * 3600);

    const minutes = Math.floor(remainder / 60);
    remainder = remainder - (minutes * 60);

    const seconds = remainder;

    let shouldPrint = false;
    const values = {
      [days]: await toPromise(this.translator.get('app.days')),
      [hours]: await toPromise(this.translator.get('app.hours')),
      [minutes]: await toPromise(this.translator.get('app.minutes')),
      [seconds]: await toPromise(this.translator.get('app.seconds')),
    };

    let result = '';
    for (const value of Object.keys(values)) {
      if (Number(value) > 0) {
        shouldPrint = true;
      }

      if (!shouldPrint) {
        continue;
      }

      result += `${Number(value)} ${values[Number(value)]}, `;
    }

    result = result.substring(0, result.length - 2);

    return result;
  }
}
