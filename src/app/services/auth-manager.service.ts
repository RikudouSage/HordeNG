import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthManagerService {
  private readonly defaultApiKey = '0000000000';

  public get apiKey(): string {
    if (typeof localStorage === 'undefined') {
      return this.defaultApiKey;
    }

    return localStorage.getItem('ai_horde_api_key') ?? this.defaultApiKey;
  }

  public set apiKey(apiKey: string) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('ai_horde_api_key', apiKey);
  }
}
