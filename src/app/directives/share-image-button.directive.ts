import {Directive, ElementRef, input, OnDestroy, OnInit, output} from '@angular/core';
import {StoredImage} from "../types/db/stored-image";
import {HttpClient} from "@angular/common/http";
import {toPromise} from "../helper/resolvable";
import {MessageService} from "../services/message.service";
import {TranslatorService} from "../services/translator.service";

@Directive({
  selector: 'button[share-image]',
  standalone: true
})
export class ShareImageButtonDirective implements OnInit, OnDestroy {
  public image = input.required<StoredImage>();

  public uploadStarted = output();
  public uploadFinished = output();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly element: ElementRef<HTMLButtonElement>,
    private readonly messenger: MessageService,
    private readonly translator: TranslatorService,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    this.element.nativeElement.addEventListener('click', this.share.bind(this));
  }

  public async ngOnDestroy(): Promise<void> {
    this.element.nativeElement.removeEventListener('click', this.share.bind(this));
  }

  private async share(): Promise<void> {
    this.uploadStarted.emit();

    try {
      const url = 'https://litterbox.catbox.moe/resources/internals/api.php';
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('time', '24h');
      formData.append('fileToUpload', this.image().data, `${this.image().id}.${this.image().format}`);

      const response = await toPromise(this.httpClient.post(url, formData, {
        responseType: 'text',
      }));


      await navigator.clipboard.writeText(response);
      await this.messenger.success(this.translator.get('app.images.temp_share.success'));
      this.uploadFinished.emit();
    } catch (e) {
      this.uploadFinished.emit();
      throw e;
    }
  }
}
