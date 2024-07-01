import {Injectable} from '@angular/core';
import {CacheService} from "./cache.service";
import {HttpClient} from "@angular/common/http";
import {from, map, Observable, of, switchMap, tap, zip} from "rxjs";
import {ModelConfigurations} from "../types/sd-repo/model-configuration";
import {CategoriesResponse, EnrichedPromptStyle, PromptStyles} from "../types/sd-repo/prompt-style";
import {mergeDeep} from "../helper/merge-deep";
import {StylePreviews} from "../types/style-preview";

interface SdxlPromptStyle {
  name: string;
  prompt: string;
  negative_prompt: string;
}

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
              this.httpClient.get<SdxlPromptStyle[]>('https://raw.githubusercontent.com/twri/sdxl_prompt_styler/main/sdxl_styles_twri.json'),
              this.httpClient.get<SdxlPromptStyle[]>('https://raw.githubusercontent.com/twri/sdxl_prompt_styler/main/sdxl_styles_sai.json'),
              this.httpClient.get<SdxlPromptStyle[]>('https://raw.githubusercontent.com/MoonRide303/Fooocus-MRE/moonride-main/sdxl_styles/sdxl_styles_mre.json'),
              this.httpClient.get<SdxlPromptStyle[]>('https://raw.githubusercontent.com/MoonRide303/Fooocus-MRE/moonride-main/sdxl_styles/sdxl_styles_diva.json'),
            ).pipe(
              map (values => {
                return mergeDeep(
                  values[0],
                  values[1],
                  this.sdxlPromptStylesToPromptStyles(values[2], 'twri'),
                  this.sdxlPromptStylesToPromptStyles(values[3], 'sai'),
                  this.sdxlPromptStylesToPromptStyles(values[4], 'mre'),
                  this.sdxlPromptStylesToPromptStyles(values[5], 'diva'),
                );
              }),
              map (styles => {
                let result: EnrichedPromptStyle[] = [];
                for (const styleName of Object.keys(styles)) {
                  const style = styles[styleName];
                  result.push({
                    ...style,
                    name: styleName,
                    category: style.category ?? this.getCategory(styleName, categories),
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
      }),
      switchMap(styles => {
        return this.httpClient.get<StylePreviews>('https://raw.githubusercontent.com/amiantos/AI-Horde-Styles-Previews/main/previews.json').pipe(
          map (previews => {
            return styles.map(style => {
              if (typeof previews[style.name] !== 'undefined') {
                style.examples = Object.values(previews[style.name]);
              }

              return style;
            });
          }),
        );
      }),
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

  private sdxlPromptStylesToPromptStyles(styles: SdxlPromptStyle[], category: string | undefined = undefined): PromptStyles {
    const result: PromptStyles = {};
    for (const style of styles) {
      let prompt = style.prompt.replace('{prompt}', '{p}');
      if (style.negative_prompt) {
        prompt += `###${style.negative_prompt},{np}`;
      }
      result[style.name] = {
        prompt: prompt,
        category: category,
        model: 'AlbedoBase XL (SDXL)',
      };
    }

    return result;
  }
}
