import {Injectable} from '@angular/core';
import {CacheService} from "./cache.service";
import {from, Observable, of, switchMap, tap} from "rxjs";

interface Stored<T> {
  expires: Date;
  item: T;
}

@Injectable({
  providedIn: 'root'
})
export class CacheHelperService {
  constructor(
    private readonly cache: CacheService,
  ) {}

  public staleWhileRevalidate<T>(key: string, expiresAfter: number, fresh: () => Observable<T>): Observable<T> {
    const saveTap = (item: T, isFresh: boolean = true) => {
      this.cache.getItem<Stored<T>>(key).then(cacheItem => {
        (isFresh ? of(item) : fresh()).subscribe(freshValue => {
          cacheItem.value = {
            expires: new Date(new Date().getTime() + expiresAfter),
            item: freshValue,
          };
          this.cache.save(cacheItem);
        });
      });
    }

    const getFresh = () => fresh().pipe(
      tap(saveTap),
    );

    return from(this.cache.getItem<Stored<T>>(key)).pipe(
      switchMap(cacheItem => {
        if (!cacheItem.isHit) {
          return getFresh();
        }

        const currentTime = new Date().getTime();
        if (cacheItem.value!.expires.getTime() < currentTime) {
          return of(cacheItem.value!.item).pipe(
            tap(value => saveTap(value, false)),
          );
        }

        return of(cacheItem.value!.item);
      }),
    );
  }
}
