import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {HttpMethod} from "../types/http-method";
import {catchError, map, Observable, of} from "rxjs";
import {ApiResponse} from "../types/api-response";
import {environment} from "../../environments/environment";
import {ErrorResponse} from "../types/error-response";
import {AuthManagerService} from "./auth-manager.service";
import {UserDetails} from "../types/horde/user-details";

@Injectable({
  providedIn: 'root'
})
export class AiHorde {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly authManager: AuthManagerService,
  ) {
  }

  public currentUser(): Observable<ApiResponse<UserDetails>> {
    return this.sendRequest(HttpMethod.Get, `find_user`);
  }

  private sendRequest<T>(
    method: HttpMethod,
    endpoint: string,
    body: {[key: string]: string | number | null | boolean} | null = null,
    headers: {[header: string]: string} | null = null,
  ): Observable<ApiResponse<T>> {
    headers ??= {};
    headers['Client-Agent'] = `${environment.appName}:${environment.appVersion}:${environment.maintainer}`;
    headers['apikey'] ??= this.authManager.apiKey();

    let url = this.createUrl(endpoint);
    if (method === HttpMethod.Get && body !== null) {
      for (const key of Object.keys(body)) {
        if (typeof body[key] !== 'string') {
          delete body[key];
        }
      }
      url += '?' + new URLSearchParams(<any>body).toString();
    }

    return this.httpClient.request<T|ErrorResponse>(method, url, {
      body: method === HttpMethod.Get ? undefined : body ?? undefined,
      headers: headers,
      observe: 'response',
    }).pipe(
      map (response => {
        return {
          success: response.ok,
          successResponse: response.ok ? <T>response.body : undefined,
          errorResponse: !response.ok ? <ErrorResponse>response.body : undefined,
          statusCode: response.status,
        };
      }),
      catchError((err: HttpErrorResponse) => {
        return of({
          success: false,
          errorResponse: err.error,
          statusCode: err.status,
        });
      }),
    );
  }

  private createUrl(endpoint: string): string {
    return `${environment.apiUrl}/${environment.apiVersion}/${endpoint}`;
  }

}
