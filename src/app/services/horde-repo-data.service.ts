import {Injectable} from '@angular/core';
import {CacheService} from "./cache.service";
import {HttpClient} from "@angular/common/http";
import {from, Observable, of, switchMap, tap} from "rxjs";
import {ModelConfigurations} from "../types/sd-repo/model-configuration";

@Injectable({
  providedIn: 'root'
})
export class HordeRepoDataService {
  private readonly CacheKeys = {
    ModelsConfig: 'repo.models_config',
  };

  constructor(
    private readonly cache: CacheService,
    private readonly httpClient: HttpClient,
  ) {
  }

  public getModelsConfig(): Observable<ModelConfigurations> {
    return from(this.cache.getItem<ModelConfigurations>(this.CacheKeys.ModelsConfig)).pipe(
      switchMap(cacheItem => {
        if (cacheItem.isHit) {
          return of(cacheItem.value!);
        }

        return this.httpClient.get<ModelConfigurations>('https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/stable_diffusion.json').pipe(
          tap(result => {
            cacheItem.value = result;
            cacheItem.expiresAfter(24 * 60 * 60)
            this.cache.save(cacheItem);
          }),
        );
      }),
    );
  }
}
