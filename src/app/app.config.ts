import {ApplicationConfig, InjectionToken, isDevMode} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withFetch} from '@angular/common/http';
import {TranslocoHttpLoader} from './transloco-loader';
import {provideTransloco} from '@jsverse/transloco';
import {defaultTranslocoMarkupTranspilers, provideTranslationMarkupTranspiler} from "ngx-transloco-markup";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideToastr} from "ngx-toastr";
import {DataStorage} from "./services/image-storage/data-storage";
import {IndexedDbDataStorage} from "./services/image-storage/indexed-db.data-storage";
import {S3DataStorage} from "./services/image-storage/s3.data-storage";
import {Credentials} from "./types/credentials/credentials";
import {GoogleDriveDataStorage} from "./services/image-storage/google-drive.data-storage";
import {DropboxDataStorage} from "./services/image-storage/dropbox.data-storage";
import {provideServiceWorker} from '@angular/service-worker';
import {ParagraphTranspiler} from "./services/transloco/paragraph-transpiler";

export const DATA_STORAGE = new InjectionToken<DataStorage<Credentials>>('ImageStorage');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // provideClientHydration(),
    provideHttpClient(withFetch()),
    provideTransloco({
      config: {
        availableLangs: ['en', 'cs'],
        defaultLang: 'en',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        fallbackLang: 'en',
      },
      loader: TranslocoHttpLoader,
    }),
    defaultTranslocoMarkupTranspilers(),
    provideTranslationMarkupTranspiler(ParagraphTranspiler),
    provideAnimations(),
    provideToastr({
      maxOpened: 3,
      preventDuplicates: true,
      countDuplicates: true,
      resetTimeoutOnDuplicate: true,
      includeTitleDuplicates: true,
      timeOut: 10_000,
      extendedTimeOut: 2_000,
      progressBar: true,
    }),
    {useClass: IndexedDbDataStorage, provide: DATA_STORAGE, multi: true},
    {useClass: S3DataStorage, provide: DATA_STORAGE, multi: true},
    {useClass: GoogleDriveDataStorage, provide: DATA_STORAGE, multi: true},
    {useClass: DropboxDataStorage, provide: DATA_STORAGE, multi: true},
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
};
