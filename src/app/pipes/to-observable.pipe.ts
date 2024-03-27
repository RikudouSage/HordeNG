import {Pipe, PipeTransform} from '@angular/core';
import {Resolvable, toObservable} from "../helper/resolvable";
import {Observable} from "rxjs";

@Pipe({
  name: 'toObservable',
  standalone: true
})
export class ToObservablePipe implements PipeTransform {

  transform<T>(value: Resolvable<T>): Observable<T> {
    return toObservable(value);
  }

}
