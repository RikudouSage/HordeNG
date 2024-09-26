import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CensorshipService {
  public readonly nsfwCensored = signal(false);

  public initialize() {
    if (typeof localStorage !== 'undefined') {
      this.nsfwCensored.set(Boolean(Number(localStorage.getItem('censorshipMode') ?? '0')))
    }
  }

  public enableCensorship(): void {
    this.nsfwCensored.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('censorshipMode', String(Number(true)));
    }
  }

  public disableCensorship(): void {
    this.nsfwCensored.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('censorshipMode', String(Number(false)));
    }
  }
}
