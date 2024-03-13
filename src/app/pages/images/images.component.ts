import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  signal,
  TemplateRef,
  ViewContainerRef,
  WritableSignal
} from '@angular/core';
import {ImageStorageManagerService} from "../../services/image-storage-manager.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {isPlatformBrowser} from "@angular/common";
import {LoaderComponent} from "../../components/loader/loader.component";
import {StoredImage} from "../../types/db/stored-image";
import {TranslocoPipe} from "@ngneat/transloco";
import {ModalService} from "../../services/modal.service";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {ImageStorage} from "../../services/image-storage/image-storage";

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
    YesNoComponent
  ],
  templateUrl: './images.component.html',
  styleUrl: './images.component.scss'
})
export class ImagesComponent implements OnInit {
  private readonly perPage: number = 24;
  private readonly isBrowser: boolean;

  public loading = signal(true);
  public pages: WritableSignal<number[]> = signal([]);
  public currentPage = signal(1);
  public lastPage = signal(1);
  public currentResults: WritableSignal<StoredImageWithLink[]> = signal([]);

  constructor(
    private readonly storageManager: ImageStorageManagerService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly view: ViewContainerRef,
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

  private async loadData(storage: ImageStorage<any>): Promise<void> {
    const images = await storage.loadImages(this.currentPage(), this.perPage);
    this.currentResults.set(images.rows.map(image => ({link: URL.createObjectURL(image.data), ...image})));

    this.pages.set([...Array(images.lastPage).keys()].map(i => i + 1));
    this.lastPage.set(images.lastPage);
  }
}
