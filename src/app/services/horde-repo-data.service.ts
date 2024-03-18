import {Injectable} from '@angular/core';
import {CacheService} from "./cache.service";
import {HttpClient} from "@angular/common/http";
import {from, map, Observable, of, switchMap, tap, zip} from "rxjs";
import {ModelConfigurations} from "../types/sd-repo/model-configuration";
import {CategoriesResponse, EnrichedPromptStyle, PromptStyles} from "../types/sd-repo/prompt-style";
import {mergeDeep} from "../helper/merge-deep";

@Injectable({
  providedIn: 'root'
})
export class HordeRepoDataService {
  private readonly CacheKeys = {
    ModelsConfig: 'repo.models_config',
    PromptStyles: 'repo.prompt_styles',
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

  public getStyles(): Observable<EnrichedPromptStyle[]> {
    return from(this.cache.getItem<EnrichedPromptStyle[]>(this.CacheKeys.PromptStyles)).pipe(
      switchMap(cacheItem => {
        if (cacheItem.isHit) {
          return of(cacheItem.value!);
        }

        return zip(
          this.httpClient.get<CategoriesResponse>('https://raw.githubusercontent.com/Haidra-Org/AI-Horde-Styles/main/categories.json'),
          this.httpClient.get<CategoriesResponse>("/assets/styles/categories.json")
        ).pipe(
          map (values => mergeDeep(values[0], values[1])),
          switchMap(categories => {
            return zip(
              this.httpClient.get<PromptStyles>('https://raw.githubusercontent.com/Haidra-Org/AI-Horde-Styles/main/styles.json'),
              this.httpClient.get<PromptStyles>('/assets/styles/styles.json'),
            ).pipe(
              map (values => mergeDeep(values[0], values[1])),
              map (styles => {
                let result: EnrichedPromptStyle[] = [];
                for (const styleName of Object.keys(styles)) {
                  const style = styles[styleName];
                  result.push({
                    ...style,
                    name: styleName,
                    category: this.getCategory(styleName, categories),
                  });
                }

                cacheItem.value = result;
                cacheItem.expiresAfter(24 * 60 * 60);
                this.cache.save(cacheItem);

                return result;
              })
            );
          }),
        );
      })
    );
  }

  private getCategory(style: string, categories: CategoriesResponse): string {
    for (const categoryName of Object.keys(categories)) {
      const list = categories[categoryName];
      if (list.includes(style)) {
        return categoryName;
      }
    }

    return 'no category';
  }
}
