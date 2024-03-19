import {
  Component, computed,
  Inject,
  OnInit,
  PLATFORM_ID,
  signal,
  TemplateRef,
  ViewContainerRef,
  WritableSignal
} from '@angular/core';
import {DataStorageManagerService} from "../../services/data-storage-manager.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {AsyncPipe, isPlatformBrowser} from "@angular/common";
import {LoaderComponent} from "../../components/loader/loader.component";
import {StoredImage} from "../../types/db/stored-image";
import {TranslocoPipe} from "@ngneat/transloco";
import {ModalService} from "../../services/modal.service";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {DataStorage} from "../../services/image-storage/data-storage";
import {DatabaseService} from "../../services/database.service";
import {PostProcessor} from "../../types/horde/post-processor";
import {LoraNamePipe} from "../../pipes/lora-name.pipe";
import {LoraTextRowComponent} from "../../components/lora-text-row/lora-text-row.component";

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
    LoraNamePipe,
    AsyncPipe,
    LoraTextRowComponent
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

  constructor(
    private readonly storageManager: DataStorageManagerService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly view: ViewContainerRef,
    private readonly database: DatabaseService,
    @Inject(PLATFORM_ID) platformId: string,
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
    this.modalService.open(this.view, modal);
  }

  public async deleteImage(image: StoredImageWithLink): Promise<void> {
    this.loading.set(true);

    const storage = await this.storageManager.currentStorage;
    await storage.deleteImage(image);
    URL.revokeObjectURL(image.link);
    await this.modalService.close();
    await this.loadData(storage);

    this.loading.set(false);
  }

  private async loadData(storage: DataStorage<any>): Promise<void> {
    const images = await storage.loadImages(this.currentPage(), this.perPage);
    this.currentResults.set(images.rows.map(image => ({link: URL.createObjectURL(image.data), ...image})));

    this.pages.set([...Array(images.lastPage).keys()].map(i => i + 1));
    this.lastPage.set(images.lastPage);
    this.imagesSizeBytes.set(await storage.getSize());
  }

  public async sendToTxt2Img(image: StoredImageWithLink): Promise<void> {
    await this.database.storeGenerationOptions(image);
    await this.router.navigateByUrl('/generate');
  }
}
