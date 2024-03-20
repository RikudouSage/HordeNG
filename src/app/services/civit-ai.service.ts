import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError, Observable, of, switchMap} from "rxjs";
import {LoraSearchResponse} from "../types/civit-ai/lora-search-response";
import {CivitAiModel} from "../types/civit-ai/civit-ai-model";
import {CivitAiModelVersionDetail} from "../types/civit-ai/civit-ai-model-version-detail";
import {CivitAiBaseModel} from "../types/civit-ai/civit-ai-base-model";

interface SearchOptions {
  query?: string;
  page?: number;
  nsfw?: boolean;
  baseModels?: CivitAiBaseModel[];
}

@Injectable({
  providedIn: 'root'
})
export class CivitAiService {
  constructor(
    private readonly httpClient: HttpClient,
  ) {}

  public searchLora(options: SearchOptions): Observable<LoraSearchResponse> {
    options.query ??= '';
    options.page ??= 1;
    options.nsfw ??= false;
    options.baseModels ??= [];

    let baseModelsString = '';
    if (options.baseModels.length) {
      baseModelsString = `&baseModels=${options.baseModels.join('&baseModels=')}`
    }

    const nsfwString = options.nsfw ? 'true' : 'false';
    return this.httpClient.get<LoraSearchResponse>(`https://civitai.com/api/v1/models?types=LORA&types=LoCon&sort=Highest%20Rated&limit=20&page=${options.page}&nsfw=${nsfwString}&query=${options.query.toLowerCase()}${baseModelsString}`).pipe(
      catchError((err): Observable<LoraSearchResponse> => {
        console.error(err);
        return of({items: [], metadata: {pageSize: 20, currentPage: options.page!}});
      }),
    );
  }

  public getLoraDetail(id: number): Observable<CivitAiModel> {
    return this.httpClient.get<CivitAiModel>(`https://civitai.com/api/v1/models/${id}`);
  }

  public getLoraByVersion(id: number): Observable<CivitAiModel> {
    return this.getVersionDetail(id).pipe(
      switchMap(version => this.getLoraDetail(version.modelId)),
    );
  }

  public getVersionDetail(id: number): Observable<CivitAiModelVersionDetail> {
    return this.httpClient.get<CivitAiModelVersionDetail>(`https://civitai.com/api/v1/model-versions/${id}`);
  }
}
