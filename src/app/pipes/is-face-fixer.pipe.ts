import {Pipe, PipeTransform} from '@angular/core';
import {PostProcessor} from "../types/horde/post-processor";
import {getFaceFixers} from "../helper/post-processor-helper";

@Pipe({
  name: 'isFaceFixer',
  standalone: true
})
export class IsFaceFixerPipe implements PipeTransform {

  transform(value: PostProcessor): boolean {
    return getFaceFixers([value]).length > 0;
  }

}
