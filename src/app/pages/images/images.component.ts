import {Component, computed, Inject, OnInit, PLATFORM_ID, signal, TemplateRef, WritableSignal} from '@angular/core';
import {DataStorageManagerService} from "../../services/data-storage-manager.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {DOCUMENT, isPlatformBrowser} from "@angular/common";
import {LoaderComponent} from "../../components/loader/loader.component";
import {StoredImage} from "../../types/db/stored-image";
import {TranslocoPipe} from "@jsverse/transloco";
import {ModalService} from "../../services/modal.service";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {DataStorage} from "../../services/image-storage/data-storage";
import {PostProcessor} from "../../types/horde/post-processor";
import {LoraTextRowComponent} from "../../components/lora-text-row/lora-text-row.component";
import {DatabaseService} from "../../services/database.service";
import {OutputFormat} from "../../types/output-format";
import {TranslatorService} from "../../services/translator.service";
import {toPromise} from "../../helper/resolvable";
import {Unsubscribable} from "../../types/unsubscribable";
import {ShareImageButtonDirective} from "../../directives/share-image-button.directive";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import JSZip from "jszip";
import {saveAs} from "file-saver";

interface StoredImageWithLink extends StoredImage {
  link: string;
}

@Component({
  selector: 'app-images',
  standalone: true,
  imports: [
    RouterLink,
    LoaderComponent,
    TranslocoPipe,
    FormatNumberPipe,
    YesNoComponent,
    LoraTextRowComponent,
    ShareImageButtonDirective,
    TranslocoMarkupComponent,
  ],
  templateUrl: './images.component.html',
  styleUrl: './images.component.scss'
})
export class ImagesComponent implements OnInit {
  protected readonly PostProcessor = PostProcessor;

  private readonly perPage: number = 24;
  private readonly isBrowser: boolean;
  private imagesSizeBytes = signal<number | null>(null);

  public loading = signal(true);
  public loaderText = signal('');
  public pages: WritableSignal<number[]> = signal([]);
  public currentPage = signal(1);
  public lastPage = signal(1);
  public currentResults: WritableSignal<StoredImageWithLink[]> = signal([]);
  public imagesSize = computed(() => {
    let result = this.imagesSizeBytes();
    if (result === null) {
      return null;
    }

    while (result > 1024) {
      result /= 1024;
    }

    return result;
  });
  public imagesSizeUnit = computed(() => {
    let result = this.imagesSizeBytes();
    if (result === null) {
      return null;
    }

    let index = 0;
    const map = ['B', 'kB', 'MB', 'GB', 'TB', 'EB', 'PB'];
    while (result > 1024) {
      result /= 1024;
      ++index;
    }

    return map[index];
  });
  public shareInProgress = signal(false);
  public downloadAllInProgress = signal(false);
  public downloadProgress = signal<[number, number]>([0, 0]);

  constructor(
    private readonly storageManager: DataStorageManagerService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly database: DatabaseService,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) platformId: string,
    private readonly translator: TranslatorService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    const storage = await this.storageManager.currentStorage;
    this.activatedRoute.queryParamMap.subscribe(async params => {
      this.loading.set(true);

      this.cleanupObjectURLs();

      this.currentPage.set(params.has('page') ? Number(params.get('page')) : 1);
      await this.loadData(storage);

      this.loading.set(false);
    });
  }

  public async goToPage(page: number): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {page: page},
      queryParamsHandling: 'merge',
    });
  }

  private cleanupObjectURLs(): void {
    for (const image of this.currentResults()) {
      URL.revokeObjectURL(image.link);
    }
  }

  public async openModal(modal: TemplateRef<Element>): Promise<void> {
    this.modalService.open(modal);
  }

  public async deleteImage(image: StoredImageWithLink): Promise<void> {
    this.loading.set(true);

    await this.modalService.close();
    const storage = await this.storageManager.currentStorage;
    await storage.deleteImage(image);
    URL.revokeObjectURL(image.link);
    await this.loadData(storage);

    this.loading.set(false);
  }

  private async loadData(storage: DataStorage<any>): Promise<void> {
    const imagesResponse = await storage.loadImages(this.currentPage(), this.perPage);
    let subscription: Unsubscribable | null = null;
    if (!imagesResponse.isLocal) {
      this.loaderText.set(await toPromise(this.translator.get('app.images.loader_text.loading_from_cloud')));
      subscription = imagesResponse.progressUpdater.subscribe(async progress => {
        if (progress.loaded === null) {
          this.loaderText.set(await toPromise(this.translator.get('app.images.loader_text.loading_from_cloud')));
          return;
        }

        if (progress.total !== null) {
          this.loaderText.set(await toPromise(this.translator.get('app.images.loader_text.loading_progress_with_total', {
            progress: progress.loaded,
            total: progress.total,
          })));
          return;
        }

        this.loaderText.set(await toPromise(this.translator.get('app.images.loader_text.loading_progress', {
          progress: progress.loaded,
        })));
      });
    }
    const images = await imagesResponse.result;
    subscription?.unsubscribe();

    this.currentResults.set(images.rows.map(image => ({link: URL.createObjectURL(image.data), ...image})));

    this.pages.set([...Array(images.lastPage).keys()].map(i => i + 1));
    this.lastPage.set(images.lastPage);
    this.imagesSizeBytes.set(await storage.getSize());
    this.downloadProgress.update(value => [value[0], images.totalCount]);

    this.loaderText.set('');
  }

  public async sendToTxt2Img(image: StoredImageWithLink): Promise<void> {
    const storage = await this.storageManager.currentStorage;
    await storage.storeGenerationOptions(image);
    await this.database.setSetting({
      setting: 'chosen_style',
      value: null,
    });
    await this.modalService.close();
    await this.router.navigateByUrl('/generate');
  }

  public async download(image: StoredImageWithLink): Promise<void> {
    const a = document.createElement('a');
    a.style.display = 'none';
    this.document.body.appendChild(a);
    a.href = image.link;
    a.download = `${image.prompt.trim()}.${image.format ?? OutputFormat.Webp}`;
    a.click();
    a.remove();
  }

  public async downloadAllImages(): Promise<void> {
    this.downloadAllInProgress.set(true);
    this.downloadProgress.update(value => [0, value[1]]);
    const storage = await this.storageManager.currentStorage;

    const zip = new JSZip();

    let lastPage = 1;
    let imageIndex = 0;
    for (let i = 1; i <= lastPage; i++) {
      const imagesResponse = await storage.loadImages(i, this.perPage);
      const images = await imagesResponse.result;
      lastPage = images.lastPage;

      for (const image of images.rows) {
        zip.file(`${image.id}.${image.format ?? OutputFormat.Webp}`, image.data);
        this.downloadProgress.update(value => [imageIndex++, value[1]]);
      }
    }

    const binary = await zip.generateAsync({type: 'blob'});
    saveAs(binary, 'HordeNG-Export.zip');
    this.downloadAllInProgress.set(false);
  }
}
