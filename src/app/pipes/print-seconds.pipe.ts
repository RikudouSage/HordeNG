import {Pipe, PipeTransform} from '@angular/core';
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
    const values = new Map<string, number>();
    values.set(await toPromise(this.translator.get('app.days', {value: days})), days);
    values.set(await toPromise(this.translator.get('app.hours', {value: hours})), hours);
    values.set(await toPromise(this.translator.get('app.minutes', {value: minutes})), minutes);
    values.set(await toPromise(this.translator.get('app.seconds', {value: seconds})), seconds);

    let result = '';
    for (const description of values.keys()) {
      const value = values.get(description)!;
      if (value > 0) {
        shouldPrint = true;
      }

      if (!shouldPrint) {
        continue;
      }

      result += `${value} ${description}, `;
    }

    result = result.substring(0, result.length - 2);

    return result;
  }
}
