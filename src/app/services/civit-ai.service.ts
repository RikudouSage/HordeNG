import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {catchError, Observable, of, switchMap} from "rxjs";
import {LoraSearchResponse} from "../types/civit-ai/lora-search-response";
import {CivitAiModel} from "../types/civit-ai/civit-ai-model";
import {CivitAiModelVersion} from "../types/civit-ai/civit-ai-model-version";
import {CivitAiModelVersionDetails} from "../types/civit-ai/civit-ai-model-version-details";

@Injectable({
  providedIn: 'root'
})
export class CivitAiService {
  constructor(
    private readonly httpClient: HttpClient,
  ) {}

  public searchLora(lora: string, page: number = 1, nsfw: boolean = false): Observable<LoraSearchResponse> {
    const nsfwString = nsfw ? 'true' : 'false';
    return this.httpClient.get<LoraSearchResponse>(`https://civitai.com/api/v1/models?types=LORA&types=LoCon&sort=Highest%20Rated&limit=20&page=${page}&nsfw=${nsfwString}&query=${lora.toLowerCase()}`).pipe(
      catchError((err): Observable<LoraSearchResponse> => {
        console.error(err);
        return of({items: [], metadata: {pageSize: 20, currentPage: page}});
      }),
    );
  }

  public getLoraDetail(id: number): Observable<CivitAiModel> {
    return this.httpClient.get<CivitAiModel>(`https://civitai.com/api/v1/models/${id}`);
  }

  public getLoraByVersion(id: number): Observable<CivitAiModel> {
    return this.httpClient.get<CivitAiModelVersionDetails>(`https://civitai.com/api/v1/model-versions/${id}`).pipe(
      switchMap(version => this.getLoraDetail(version.modelId)),
    );
  }
}
