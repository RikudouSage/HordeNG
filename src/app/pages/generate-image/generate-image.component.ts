import {Component, Inject, OnInit, PLATFORM_ID, signal, WritableSignal} from '@angular/core';
import {FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Sampler} from "../../types/horde/sampler";
import {DatabaseService} from "../../services/database.service";
import {LoaderComponent} from "../../components/loader/loader.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {AsyncPipe, isPlatformBrowser, KeyValuePipe, NgOptimizedImage} from "@angular/common";
import {AppValidators} from "../../helper/app-validators";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {KudosCostCalculator} from "../../services/kudos-cost-calculator.service";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {interval, map} from "rxjs";
import {WorkerType} from "../../types/horde/worker-type";
import {JobInProgress} from "../../types/db/job-in-progress";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {GenerationOptions} from "../../types/db/generation-options";
import {RequestStatusCheck} from "../../types/horde/request-status-check";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {BlobToUrlPipe} from "../../pipes/blob-to-url.pipe";
import {JobMetadata} from "../../types/job-metadata";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {RequestStatusFull} from "../../types/horde/request-status-full";
import {UnsavedStoredImage} from "../../types/db/stored-image";
import {ImageStorageManagerService} from "../../services/image-storage-manager.service";
import {PostProcessor} from "../../types/horde/post-processor";
import {TomSelectDirective} from "../../directives/tom-select.directive";

interface Result {
  width: number;
  height: number;
  source: string;
  workerId: string;
  workerName: string;
  model: string;
  seed: string;
  id: string;
  censored: boolean;
  kudos: number;
  postProcessors: string;
}

@Component({
  selector: 'app-generate-image',
  standalone: true,
  imports: [
    LoaderComponent,
    TranslocoPipe,
    ReactiveFormsModule,
    KeyValuePipe,
    FormatNumberPipe,
    PrintSecondsPipe,
    AsyncPipe,
    BlobToUrlPipe,
    NgOptimizedImage,
    TranslocoMarkupComponent,
    TomSelectDirective
  ],
  templateUrl: './generate-image.component.html',
  styleUrl: './generate-image.component.scss'
})
export class GenerateImageComponent implements OnInit {
  protected readonly Sampler = Sampler;
  protected readonly PostProcessor = PostProcessor;

  public loading = signal(true);
  public kudosCost = signal(0);
  public availableModels: WritableSignal<string[]> = signal([]);
  public inProgress: WritableSignal<JobInProgress | null> = signal(null);
  public result: WritableSignal<Result | null> = signal(null);
  public requestStatus: WritableSignal<RequestStatusCheck | null> = signal(null);

  public form = new FormGroup({
    prompt: new FormControl<string>('', [
      Validators.required,
    ]),
    negativePrompt: new FormControl<string | null>(null),
    sampler: new FormControl<Sampler>(Sampler.k_dpmpp_sde, [
      Validators.required,
    ]),
    cfgScale: new FormControl<number>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    denoisingStrength: new FormControl<number>(0, [
      Validators.min(0.01),
      Validators.max(1),
    ]),
    height: new FormControl<number>(0, [
      Validators.required,
      Validators.min(64),
      Validators.max(3072),
      AppValidators.divisibleBy(64),
    ]),
    width: new FormControl<number>(0, [
      Validators.required,
      Validators.min(64),
      Validators.max(3072),
      AppValidators.divisibleBy(64),
    ]),
    steps: new FormControl<number>(0, [
      Validators.required,
      Validators.min(1),
      Validators.max(500),
    ]),
    model: new FormControl<string>('', [
      Validators.required,
    ]),
    postProcessors: new FormControl<string[]>([]),
  });
  private readonly isBrowser: boolean;

  constructor(
    private readonly database: DatabaseService,
    private readonly costCalculator: KudosCostCalculator,
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    private readonly httpClient: HttpClient,
    private readonly imageStorage: ImageStorageManagerService,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  public async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    this.form.patchValue(await this.database.getGenerationOptions());
    this.inProgress.set((await this.database.getJobsInProgress())[0] ?? null);
    this.kudosCost.set(this.costCalculator.calculate(await this.database.getGenerationOptions()));
    this.form.valueChanges.subscribe(async changes => {
      await this.database.storeGenerationOptions(this.formAsOptions);
      this.kudosCost.set(this.costCalculator.calculate(await this.database.getGenerationOptions()));
    });
    this.availableModels.set(await toPromise(this.api.getModels().pipe(
      map (response => {
        if (!response.success) {
          this.messageService.error(this.translator.get('app.error.models_fetching_failed'));
          throw new Error("Failed fetching list of models");
        }

        return response.successResponse!
          .filter(model => model.type === WorkerType.image)
          .map(model => model.name);
      }),
    )));
    this.loading.set(false);

    interval(1_000).subscribe(async () => {
      if (!this.inProgress()) {
        return;
      }

      const response = await toPromise(this.api.checkGenerationStatus(this.inProgress()!));
      if (!response.success) {
        await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
        return;
      }

      const status = response.successResponse!;
      this.requestStatus.set(status);

      if (!status.is_possible) {
        await toPromise(this.api.cancelJob(this.inProgress()!));
        await this.database.deleteInProgressJob(this.inProgress()!);
        this.inProgress.set(null);
        await this.messageService.error(this.translator.get('app.error.generate.impossible'));
        return;
      }

      if (status.done) {
        this.loading.set(true);
        const job = this.inProgress() ?? (await this.database.getJobsInProgress())[0] ?? null;
        this.inProgress.set(null);
        if (job === null) {
          throw new Error("Job cannot be null");
        }

        const resultResponse = await toPromise(this.api.getGeneratedImageResult(job));
        if (!resultResponse.success) {
          await this.messageService.error(this.translator.get('app.error.api_error', {message: resultResponse.errorResponse!.message, code: resultResponse.errorResponse!.rc}));
          this.loading.set(false);
          return;
        }

        const result = resultResponse.successResponse!;
        const metadata = (await this.database.getJobMetadata(job))!;
        await this.downloadImages(result, metadata);

        await this.database.deleteInProgressJob(job);

        this.loading.set(false);
      }
    });
  }

  public async generateImage() {
    if (!this.form.valid) {
      await this.messageService.error(this.translator.get('app.error.form_invalid'));
      return;
    }
    if (this.inProgress()) {
      await this.messageService.error(this.translator.get('app.error.generation_in_progress'));
      return;
    }
    this.loading.set(true);
    if (this.result()) {
      URL.revokeObjectURL(this.result()!.source);
    }
    this.result.set(null);
    const response = await toPromise(this.api.generateImage(this.formAsOptions));
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
      this.loading.set(false);
      return;
    }

    await this.database.addInProgressJob(response.successResponse!);
    await this.database.storeJobMetadata({
      requestId: response.successResponse!.id,
      height: this.formAsOptions.height,
      width: this.formAsOptions.width,
      postProcessors: this.formAsOptions.postProcessors,
    });
    this.inProgress.set(response.successResponse!);
    this.loading.set(false);
  }

  private get formAsOptions(): GenerationOptions {
    const value = this.form.value;
    return {
      prompt: value.prompt ?? '',
      negativePrompt: value.negativePrompt ?? null,
      sampler: value.sampler ?? Sampler.k_dpmpp_sde,
      cfgScale: value.cfgScale ?? 0.75,
      denoisingStrength: value.denoisingStrength ?? 0.75,
      height: value.height ?? 512,
      width: value.width ?? 512,
      steps: value.steps ?? 30,
      model: value.model ?? '',
      karras: true, // todo
      postProcessors: value.postProcessors?.map(value => <PostProcessor>value) ?? [],
    };
  }

  private async downloadImages(result: RequestStatusFull, metadata: JobMetadata): Promise<void> {
    const generations = result.generations;
    const promises: Array<Promise<HttpResponse<Blob>>> = [];
    for (const generation of generations) {
      promises.push(toPromise(this.httpClient.get(generation.img, {observe: 'response', responseType: 'blob'})));
    }
    const responses = await Promise.all(promises);
    // todo handle multiple images
    const image = responses[0].body;
    if (image === null) {
      await this.messageService.error(this.translator.get('app.error.image_download_failed'));
      return;
    }

    this.result.set({
      source: URL.createObjectURL(image),
      width: metadata.width,
      height: metadata.height,
      workerId: generations[0].worker_id,
      model: generations[0].model,
      censored: generations[0].censored,
      workerName: generations[0].worker_name,
      seed: generations[0].seed,
      id: generations[0].id,
      kudos: result.kudos,
      postProcessors: metadata.postProcessors.join(', '),
    });
    const storeData: UnsavedStoredImage = {
      id: generations[0].id,
      data: image,
      model: generations[0].model,
      seed: generations[0].seed,
      loras: [],
      worker: {
        id: generations[0].worker_id,
        name: generations[0].worker_name,
      },
      postProcessors: metadata.postProcessors,
    };
    const storage = await this.imageStorage.currentStorage;
    await storage.storeImage(storeData);
  }
}
