import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {HttpMethod} from "../types/http-method";
import {catchError, filter, forkJoin, map, Observable, of, switchMap} from "rxjs";
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
import {UpdateWorkerRequest} from "../types/horde/update-worker-request";
import {CacheHelperService} from "./cache-helper.service";
import {RequestErrorCode} from "../types/horde/request-error-code";
import {WorkerType} from "../types/horde/worker-type";
import {IncomingPrivateMessage, OutgoingPrivateMessage} from "../types/incoming-private-message";

@Injectable({
  providedIn: 'root'
})
export class AiHorde {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly authManager: AuthManagerService,
    private readonly cacheHelper: CacheHelperService,
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

  public getAllWorkers(): Observable<ApiResponse<WorkerDetails[]>> {
    return this.sendRequest(HttpMethod.Get, `workers?type=image`);
  }

  public getModels(): Observable<ApiResponse<ActiveModel[]>> {
    return this.cacheHelper.staleWhileRevalidate(
      `horde.models`,
      5 * 60 * 1000,
      () => this.sendRequest(HttpMethod.Get, `status/models`),
    );
  }

  public generateImage(options: GenerationOptions): Observable<ApiResponse<AsyncGenerationResponse>>;
  public generateImage<TDryRun extends boolean>(options: GenerationOptions, dryRun: TDryRun): Observable<ApiResponse<TDryRun extends true ? KudosCostResponse : AsyncGenerationResponse>>;
  public generateImage<TDryRun extends boolean>(options: GenerationOptions, dryRun: TDryRun = <TDryRun>false): Observable<ApiResponse<TDryRun extends true ? KudosCostResponse : AsyncGenerationResponse>> {
    const resultFactory = (workers: string[] | null = null) => {
      let extraTexts: {text: string, reference: string}[] | undefined = undefined;
      if (options.qrCode?.text) {
        extraTexts ??= [];
        extraTexts.push({
          text: options.qrCode.text,
          reference: 'qr_code',
        });

        if (options.qrCode?.positionX) {
          extraTexts.push({
            text: String(options.qrCode.positionX),
            reference: 'x_offset',
          });
        }
        if (options.qrCode?.positionY) {
          extraTexts.push({
            text: String(options.qrCode.positionY),
            reference: 'y_offset',
          });
        }
        if (options.qrCode?.markersPrompt) {
          extraTexts.push({
            text: options.qrCode.markersPrompt,
            reference: 'function_layer_prompt',
          });
        }
      }

      return this.sendRequest<TDryRun extends true ? KudosCostResponse : AsyncGenerationResponse>(HttpMethod.Post, `generate/async`, {
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
          transparent: options.transparent,
          loras: options.loraList.map(lora => ({
            name: String(lora.id),
            model: lora.strengthModel,
            clip: lora.strengthClip,
            inject_trigger: lora.injectTrigger,
            is_version: lora.isVersionId,
          })),
          tis: options.textualInversionList.map(textualInversion => ({
            name: String(textualInversion.id),
            inject_ti: (() => {
              switch (textualInversion.inject) {
                case "prompt":
                  return "prompt";
                case "negative":
                  return "negprompt";
              }

              return undefined;
            })(),
            strength: textualInversion.strength,
          })),
          n: options.amount,
          extra_texts: extraTexts,
          workflow: options.qrCode?.text ? 'qr_code' : undefined,
        },
        nsfw: options.nsfw,
        trusted_workers: workers !== null ? false : options.trustedWorkers,
        slow_workers: workers !== null ? true : options.slowWorkers,
        extra_slow_workers: workers !== null ? true : options.extraSlowWorkers,
        censor_nsfw: options.censorNsfw,
        models: [options.model],
        dry_run: dryRun,
        allow_downgrade: options.allowDowngrade,
        workers: workers !== null ? workers : undefined,
      });
    };

    if (!options.onlyMyWorkers) {
      return resultFactory();
    }

    return this.currentUser().pipe(
      switchMap(response => {
        if (!response.success) {
          return of(null);
        }

        const workerIds = response.successResponse!.worker_ids ?? [];
        return forkJoin(workerIds.map(id => this.getWorkerDetail(id).pipe(
          filter(item => item.success),
          map(item => item.successResponse!),
        )));
      }),
      map(result => {
        if (result === null) {
          return null;
        }

        return result.filter(worker => worker.type === WorkerType.image);
      }),
      switchMap(result => {
        if (result === null) {
          return of({
            success: false,
            statusCode: 500,
            errorResponse: {
              message: 'Failed fetching the current user',
              rc: RequestErrorCode.UserNotFound,
            },
          });
        }

        return resultFactory(result.map(worker => worker.id));
      }),
    );
  }

  public checkGenerationStatus(job: JobInProgress): Observable<ApiResponse<RequestStatusCheck>> {
    return this.sendRequest(HttpMethod.Get, `generate/check/${job.id}`);
  }

  public getGeneratedImageResult(job: JobInProgress): Observable<ApiResponse<RequestStatusFull>> {
    return this.sendRequest(HttpMethod.Get, `generate/status/${job.id}`);
  }

  public getMessages(): Observable<ApiResponse<IncomingPrivateMessage[]>> {
    return this.sendRequest(HttpMethod.Get, `workers/messages`);
  }

  public sendMessage(message: OutgoingPrivateMessage): Observable<ApiResponse<IncomingPrivateMessage>> {
    return this.sendRequest(HttpMethod.Post, `workers/messages`, message);
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

  public updateSharedKey(key: Omit<SharedKey, 'utilized' | 'username'>): Observable<ApiResponse<SharedKey>> {
    const update: Omit<SharedKey, 'utilized' | 'username' | 'id'> = {
      name: key.name,
      expiry: key.expiry,
      max_text_tokens: key.max_text_tokens,
      kudos: key.kudos,
      max_image_steps: key.max_image_steps,
      max_image_pixels: key.max_image_pixels,
    };
    return this.sendRequest(HttpMethod.Patch, `sharedKeys/${key.id}`, update);
  }

  public removeSharedKey(key: SharedKey): Observable<ApiResponse<any>> {
    // noinspection SpellCheckingInspection
    return this.sendRequest(HttpMethod.Delete, `sharedkeys/${key.id}`);
  }

  public updateWorker(id: string, workerSettings: UpdateWorkerRequest): Observable<ApiResponse<any>> {
    return this.sendRequest(HttpMethod.Put, `workers/${id}`, workerSettings);
  }

  public deleteWorker(id: string): Observable<ApiResponse<any>> {
    return this.sendRequest(HttpMethod.Delete, `workers/${id}`);
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
