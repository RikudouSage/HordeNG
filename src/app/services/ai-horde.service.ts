import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {HttpMethod} from "../types/http-method";
import {catchError, forkJoin, map, Observable, of} from "rxjs";
import {ApiResponse} from "../types/api-response";
import {environment} from "../../environments/environment";
import {ErrorResponse} from "../types/error-response";
import {AuthManagerService} from "./auth-manager.service";
import {UserDetails} from "../types/horde/user-details";
import {HordePerformance} from "../types/horde/horde-performance";
import {WorkerDetails} from "../types/horde/worker-details";
import {ActiveModel} from "../types/horde/active-model";
import {GenerationOptions} from "../types/db/generation-options";
import {AsyncGenerationResponse} from "../types/horde/async-generation-response";
import {JobInProgress} from "../types/db/job-in-progress";
import {RequestStatusCheck} from "../types/horde/request-status-check";
import {RequestStatusFull} from "../types/horde/request-status-full";
import {SharedKey, UncreatedSharedKey} from "../types/horde/shared-key";
import {KudosCostResponse} from "../types/horde/kudos-cost-response";

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

  public getPerformanceStatus(): Observable<ApiResponse<HordePerformance>> {
    return this.sendRequest(HttpMethod.Get, `status/performance`);
  }

  public getWorkerDetail(id: string): Observable<ApiResponse<WorkerDetails>> {
    return this.sendRequest(HttpMethod.Get, `workers/${id}`);
  }

  public getModels(): Observable<ApiResponse<ActiveModel[]>> {
    return this.sendRequest(HttpMethod.Get, `status/models`);
  }

  public generateImage(options: GenerationOptions): Observable<ApiResponse<AsyncGenerationResponse>>;
  public generateImage<TDryRun extends boolean>(options: GenerationOptions, dryRun: TDryRun): Observable<ApiResponse<TDryRun extends true ? KudosCostResponse : AsyncGenerationResponse>>;
  public generateImage<TDryRun extends boolean>(options: GenerationOptions, dryRun: TDryRun = <TDryRun>false): Observable<ApiResponse<TDryRun extends true ? KudosCostResponse : AsyncGenerationResponse>> {
    return this.sendRequest(HttpMethod.Post, `generate/async`, {
      prompt: options.negativePrompt ? `${options.prompt} ### ${options.negativePrompt}` : options.prompt,
      params: {
        sampler_name: options.sampler,
        cfg_scale: options.cfgScale,
        denoising_strength: options.denoisingStrength,
        height: options.height,
        width: options.width,
        steps: options.steps,
        karras: options.karras,
        post_processing: options.postProcessors,
        seed: options.seed ?? undefined,
        hires_fix: options.hiresFix,
        facefixer_strength: options.faceFixerStrength,
        clip_skip: options.clipSkip,
      },
      nsfw: options.nsfw,
      trusted_workers: options.trustedWorkers,
      slow_workers: options.slowWorkers,
      censor_nsfw: options.censorNsfw,
      models: [options.model],
      dry_run: dryRun,
      allow_downgrade: options.allowDowngrade,
    });
  }

  public checkGenerationStatus(job: JobInProgress): Observable<ApiResponse<RequestStatusCheck>> {
    return this.sendRequest(HttpMethod.Get, `generate/check/${job.id}`);
  }

  public getGeneratedImageResult(job: JobInProgress): Observable<ApiResponse<RequestStatusFull>> {
    return this.sendRequest(HttpMethod.Get, `generate/status/${job.id}`);
  }

  public cancelJob(job: JobInProgress): Observable<ApiResponse<any>> {
    return this.sendRequest(HttpMethod.Delete, `generate/status/${job.id}`);
  }

  public transferKudos(recipient: string, amount: number): Observable<ApiResponse<any>> {
    return this.sendRequest(HttpMethod.Post, `kudos/transfer`, {
      username: recipient,
      amount: amount,
    });
  }

  public getSharedKeys(ids: string[]): Observable<ApiResponse<SharedKey[]>> {
    return forkJoin(ids.map(id => this.sendRequest<SharedKey>(HttpMethod.Get, `sharedkeys/${id}`))).pipe(
      map ((responses): ApiResponse<SharedKey[]> => {
        const result: SharedKey[] = [];
        for (const response of responses) {
          if (!response.success) {
            continue;
          }
          result.push(response.successResponse!);
        }

        return {success: true, statusCode: 200, successResponse: result};
      }),
    );
  }

  public createSharedKey(key: UncreatedSharedKey): Observable<ApiResponse<SharedKey>> {
    // noinspection SpellCheckingInspection
    return this.sendRequest(HttpMethod.Put, `sharedkeys`, key);
  }

  public removeSharedKey(key: SharedKey): Observable<ApiResponse<any>> {
    // noinspection SpellCheckingInspection
    return this.sendRequest(HttpMethod.Delete, `sharedkeys/${key.id}`);
  }

  private sendRequest<T>(
    method: HttpMethod,
    endpoint: string,
    body: {[key: string]: any} | null = null,
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
