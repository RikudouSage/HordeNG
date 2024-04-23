import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'gcd',
  standalone: true
})
export class GreatestCommonDivisorPipe implements PipeTransform {

  transform(value: [number, number]): number {
    return this.gcd(value[0], value[1]);
  }

  private gcd(a: number, b: number): number {
    if (b === 0) {
      return a
    }

    return this.gcd(b, a % b)
  }

}
