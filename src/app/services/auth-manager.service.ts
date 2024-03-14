import {computed, Injectable, Signal, signal, WritableSignal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthManagerService {
  public readonly anonymousApiKey = '0000000000';
  private _apiKey: WritableSignal<string> = signal(typeof localStorage === 'undefined' ? this.anonymousApiKey : localStorage.getItem('ai_horde_api_key') ?? this.anonymousApiKey);

  public readonly isAnonymous = computed(() => this._apiKey() === this.anonymousApiKey);

  public get apiKey(): Signal<string> {
    return this._apiKey;
  }

  public set apiKey(apiKey: string) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('ai_horde_api_key', apiKey);
    this._apiKey.set(apiKey);
  }
}
