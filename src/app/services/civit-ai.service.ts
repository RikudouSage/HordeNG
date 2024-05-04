import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError, Observable, of, switchMap} from "rxjs";
import {ModelSearchResponse} from "../types/civit-ai/model-search-response";
import {CivitAiModel} from "../types/civit-ai/civit-ai-model";
import {CivitAiModelVersionDetail} from "../types/civit-ai/civit-ai-model-version-detail";
import {CivitAiBaseModel} from "../types/civit-ai/civit-ai-base-model";

enum ModelType {
  Lora = 'LORA',
  Lycoris = 'LoCon',
  TextualInversion = 'TextualInversion',
}

interface SearchOptions {
  query?: string;
  page?: number;
  nsfw?: boolean;
  baseModels?: CivitAiBaseModel[];
  nextPageCursor?: string;
  types?: ModelType[];
}

@Injectable({
  providedIn: 'root'
})
export class CivitAiService {
  constructor(
    private readonly httpClient: HttpClient,
  ) {}

  public searchLora(options: SearchOptions): Observable<ModelSearchResponse> {
    return this.searchModels({...options, types: [ModelType.Lora, ModelType.Lycoris]});
  }

  public searchTextualInversions(options: SearchOptions): Observable<ModelSearchResponse> {
    return this.searchModels({...options, types: [ModelType.TextualInversion]});
  }

  public searchModels(options: SearchOptions): Observable<ModelSearchResponse> {
    options.query ??= '';
    options.page ??= 1;
    options.nsfw ??= false;
    options.baseModels ??= [];

    let baseModelsString = '';
    if (options.baseModels.length) {
      baseModelsString = `&baseModels=${options.baseModels.join('&baseModels=')}`
    }

    const types = options.types?.map(type => `types=${type}`).join('&');

    const nsfwString = options.nsfw ? 'true' : 'false';
    let url = `https://civitai.com/api/v1/models?${types}&sort=Highest%20Rated&limit=20&page=${options.page}&nsfw=${nsfwString}&query=${options.query.toLowerCase()}${baseModelsString}`
    if (options.nextPageCursor) {
      url += `&cursor=${options.nextPageCursor}`;
    }

    return this.httpClient.get<ModelSearchResponse>(url).pipe(
      catchError((err): Observable<ModelSearchResponse> => {
        console.error(err);
        return of({items: [], metadata: {pageSize: 20, currentPage: options.page!}});
      }),
    );
  }

  public getModelDetail(id: number): Observable<CivitAiModel> {
    return this.httpClient.get<CivitAiModel>(`https://civitai.com/api/v1/models/${id}`);
  }

  public getModelByVersion(id: number): Observable<CivitAiModel> {
    return this.getVersionDetail(id).pipe(
      switchMap(version => this.getModelDetail(version.modelId)),
    );
  }

  public getVersionDetail(id: number): Observable<CivitAiModelVersionDetail> {
    return this.httpClient.get<CivitAiModelVersionDetail>(`https://civitai.com/api/v1/model-versions/${id}`);
  }
}
