import {Component, computed, input, OnDestroy} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {map, of, switchMap, tap} from "rxjs";
import {CacheService} from "../../services/cache.service";
import {toObservable} from "../../helper/resolvable";
import {AsyncPipe} from "@angular/common";

@Component({
  selector: 'app-img',
  standalone: true,
  imports: [
    AsyncPipe
  ],
  templateUrl: './cacheable-image.component.html',
  styleUrl: './cacheable-image.component.scss'
})
export class CacheableImageComponent implements OnDestroy {
  private readonly toCleanup: string[] = [];

  public src = input.required<string>();
  public alt = input.required<string>();

  public validity = input(86_400);

  public realSrc = computed(() => {
    if (!this.src()) {
      return of('');
    }

    const validity = this.validity();
    const cacheItemName = `app.cacheable_image.${this.src()}`;
    const cacheItemNameStale = `${cacheItemName}.stale`;

    const fetchFreshAndSave = () => this.httpClient.get(this.src()!, {
      responseType: 'blob',
    }).pipe(
      tap(result => {
        Promise.all([
          this.cache.getItem<Blob>(cacheItemName),
          this.cache.getItem<Blob>(cacheItemNameStale),
        ]).then(cacheItems => {
          cacheItems[0].expiresAfter(validity);

          for (const cacheItem of cacheItems) {
            cacheItem.value = result;
            this.cache.save(cacheItem);
          }
        });
      })
    );

    return toObservable(this.cache.getItem<Blob>(cacheItemName)).pipe(
      switchMap(cacheItem => {
        if (cacheItem.isHit) {
          return of(cacheItem);
        }

        return toObservable(this.cache.getItem<Blob>(cacheItemNameStale));
      }),
      map(cacheItem => {
        if (!cacheItem.isHit) {
          return null;
        }
        if (cacheItem.expires === undefined) {
          // this is the stale cache item, fetch it anew and store in both fresh and stale caches
          fetchFreshAndSave().subscribe().unsubscribe();
        }

        return cacheItem.value!;
      }),
      switchMap (item => {
        if (item === null) {
          return fetchFreshAndSave();
        }

        return of(item);
      }),
      map (blob => {
        const url = URL.createObjectURL(blob);
        this.toCleanup.push(url);

        return url;
      }),
    );
  });

  constructor(
    private readonly httpClient: HttpClient,
    private readonly cache: CacheService,
  ) {
  }

  public ngOnDestroy(): void {
    for (const url of this.toCleanup) {
      URL.revokeObjectURL(url);
    }
  }
}
