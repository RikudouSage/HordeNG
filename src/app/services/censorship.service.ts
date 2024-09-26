import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CensorshipService {
  public readonly nsfwCensored = signal(false);
}
