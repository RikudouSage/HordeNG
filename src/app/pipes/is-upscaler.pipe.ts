import {Pipe, PipeTransform} from '@angular/core';
import {PostProcessor} from "../types/horde/post-processor";
import {getUpscalers} from "../helper/post-processor-helper";

@Pipe({
  name: 'isUpscaler',
  standalone: true
})
export class IsUpscalerPipe implements PipeTransform {

  transform(value: PostProcessor): boolean {
    return getUpscalers([value]).length > 0;
  }

}
