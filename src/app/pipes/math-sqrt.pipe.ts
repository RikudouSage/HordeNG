import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'mathSqrt',
  standalone: true
})
export class MathSqrtPipe implements PipeTransform {

  transform(value: number): number {
    return Math.sqrt(value);
  }

}
