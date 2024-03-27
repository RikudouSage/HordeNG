import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'blobToUrl',
  standalone: true
})
export class BlobToUrlPipe implements PipeTransform {
  public transform(value: Blob): string {
    return URL.createObjectURL(value);
  }
}
