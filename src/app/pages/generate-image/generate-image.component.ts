import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Signal,
  signal,
  TemplateRef,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Sampler} from "../../types/horde/sampler";
import {DatabaseService} from "../../services/database.service";
import {LoaderComponent} from "../../components/loader/loader.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {AsyncPipe, DOCUMENT, isPlatformBrowser, JsonPipe, KeyValuePipe, NgOptimizedImage} from "@angular/common";
import {AppValidators} from "../../helper/app-validators";
import {FormatNumberPipe} from "../../pipes/format-number.pipe";
import {KudosCostCalculator} from "../../services/kudos-cost-calculator.service";
import {AiHorde} from "../../services/ai-horde.service";
import {toPromise} from "../../helper/resolvable";
import {debounceTime, interval, map, pairwise, startWith, Subscription} from "rxjs";
import {WorkerType} from "../../types/horde/worker-type";
import {JobInProgress} from "../../types/db/job-in-progress";
import {MessageService} from "../../services/message.service";
import {TranslatorService} from "../../services/translator.service";
import {
  DefaultGenerationOptions,
  GenerationOptions,
  LoraGenerationOption,
  TextualInversionGenerationOption
} from "../../types/db/generation-options";
import {RequestStatusCheck} from "../../types/horde/request-status-check";
import {PrintSecondsPipe} from "../../pipes/print-seconds.pipe";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {BlobToUrlPipe} from "../../pipes/blob-to-url.pipe";
import {JobMetadata} from "../../types/job-metadata";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {RequestStatusFull} from "../../types/horde/request-status-full";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {DataStorageManagerService} from "../../services/data-storage-manager.service";
import {PostProcessor} from "../../types/horde/post-processor";
import {TomSelectDirective} from "../../directives/tom-select.directive";
import {ToggleCheckboxComponent} from "../../components/toggle-checkbox/toggle-checkbox.component";
import {ModelConfiguration, ModelConfigurations} from "../../types/sd-repo/model-configuration";
import {HordeRepoDataService} from "../../services/horde-repo-data.service";
import {YesNoComponent} from "../../components/yes-no/yes-no.component";
import {
  GenerationOptionsValidatorService,
  OptionsValidationError,
  OptionsValidationErrors
} from "../../services/generation-options-validator.service";
import {PromptStyleModalComponent} from "../../components/prompt-style-modal/prompt-style-modal.component";
import {ModalService} from "../../services/modal.service";
import {EnrichedPromptStyle} from "../../types/sd-repo/prompt-style";
import {EffectiveValueComponent} from "../../components/effective-value/effective-value.component";
import {CivitAiModelNamePipe} from "../../pipes/civit-ai-model-name.pipe";
import {faExternalLink, faPencil, faRemove} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {LoraSelectorComponent} from "../../components/lora-selector/lora-selector.component";
import {LoraTextRowComponent} from "../../components/lora-text-row/lora-text-row.component";
import {IsFaceFixerPipe} from "../../pipes/is-face-fixer.pipe";
import {IsUpscalerPipe} from "../../pipes/is-upscaler.pipe";
import {getFaceFixers, getGenericPostProcessors, getUpscalers} from "../../helper/post-processor-helper";
import _ from 'lodash';
import {BaselineModel} from "../../types/sd-repo/baseline-model";
import {AutoGrowDirective} from "../../directives/auto-grow.directive";
import {SliderWithValueComponent} from "../../components/slider-with-value/slider-with-value.component";
import {TooltipComponent} from "../../components/tooltip/tooltip.component";
import {ConfigureLoraComponent, ConfigureLoraResult} from "../../components/configure-lora/configure-lora.component";
import {CivitAiService} from "../../services/civit-ai.service";
import {CivitAiModelVersionIdPipe} from "../../pipes/civit-ai-model-version-id.pipe";
import {ModelStyle} from "../../types/sd-repo/model-style";
import {ModelType} from "../../types/sd-repo/model-type";
import {Swiper} from "swiper";
import {Navigation, Pagination, Thumbs} from "swiper/modules";
import {CopyButtonComponent} from "../../components/copy-button/copy-button.component";
import {CivitAiModelIdPipe} from "../../pipes/civit-ai-model-id.pipe";
import {GreatestCommonDivisorPipe} from "../../pipes/greatest-common-divisor.pipe";
import {AspectRatioComponent} from "../../components/aspect-ratio/aspect-ratio.component";
import {ActivatedRoute} from "@angular/router";
import {toByteArray} from "base64-js";
import {ExternalRequest} from "../../types/external-request";
import {TextualInversionsComponent} from "./parts/textual-inversions/textual-inversions.component";
import {decodeWebP, encodePng} from "image-in-browser";
import {addMetadata} from "meta-png";
import {OutputFormat} from "../../types/output-format";

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
  prompt: string;
}

// const fakeData: Result[] = [
//   {
//     width: 453,
//     height: 600,
//     source: 'https://pixlr.com/images/index/ai-image-generator-three.webp',
//     workerId: 'a48caa64-5bbc-4ba9-85fd-5c6b6414d7bf',
//     workerName: 'Fake worker',
//     model: 'Fake model',
//     seed: '123',
//     id: 'b1ddf95e-7825-4a02-82a1-a09e7734f2c4',
//     censored: false,
//     kudos: 30,
//     postProcessors: '',
//     prompt: 'Some fake prompt',
//   },
//   {
//     width: 866,
//     height: 360,
//     source: 'https://t4.ftcdn.net/jpg/02/56/10/07/360_F_256100731_qNLp6MQ3FjYtA3Freu9epjhsAj2cwU9c.jpg',
//     workerId: 'a48caa64-5bbc-4ba9-85fd-5c6b6414d7bf',
//     workerName: 'Fake worker',
//     model: 'Fake model',
//     seed: '123',
//     id: '8a3936a2-f935-4bc3-acf3-025a9151e452',
//     censored: false,
//     kudos: 30,
//     postProcessors: '',
//     prompt: 'Some fake prompt',
//   },
//   {
//     width: 540,
//     height: 360,
//     source: 'https://t3.ftcdn.net/jpg/02/70/35/00/360_F_270350073_WO6yQAdptEnAhYKM5GuA9035wbRnVJSr.jpg',
//     workerId: 'a48caa64-5bbc-4ba9-85fd-5c6b6414d7bf',
//     workerName: 'Fake worker',
//     model: 'Fake model',
//     seed: '123',
//     id: '806cde5e-45d4-4709-b82e-fa3cb14f27ed',
//     censored: false,
//     kudos: 30,
//     postProcessors: '',
//     prompt: 'Some fake prompt',
//   },
// ];

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
    TomSelectDirective,
    ToggleCheckboxComponent,
    JsonPipe,
    YesNoComponent,
    PromptStyleModalComponent,
    EffectiveValueComponent,
    CivitAiModelNamePipe,
    FaIconComponent,
    LoraSelectorComponent,
    LoraTextRowComponent,
    IsFaceFixerPipe,
    IsUpscalerPipe,
    AutoGrowDirective,
    SliderWithValueComponent,
    TooltipComponent,
    ConfigureLoraComponent,
    CivitAiModelVersionIdPipe,
    CopyButtonComponent,
    CivitAiModelIdPipe,
    GreatestCommonDivisorPipe,
    AspectRatioComponent,
    TextualInversionsComponent
  ],
  templateUrl: './generate-image.component.html',
  styleUrl: './generate-image.component.scss'
})
export class GenerateImageComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly isBrowser: boolean;

  protected readonly Sampler = Sampler;
  protected readonly PostProcessor = PostProcessor;
  protected readonly OptionsValidationError = OptionsValidationError;
  protected readonly BaselineModel = BaselineModel;

  private checkInterval: Subscription | null = null;
  private swiper: Swiper | null = null;
  private swiperThumbs: Swiper | null = null;

  private currentModelName: WritableSignal<string> = signal('');
  private currentPrompt: WritableSignal<string> = signal('');
  private currentNegativePrompt: WritableSignal<string | null> = signal(null);

  private viewInitialized = signal(false);
  private swiperContainer = signal<ElementRef<HTMLDivElement> | null>(null);
  private swiperThumbsContainer = signal<ElementRef<HTMLDivElement> | null>(null);
  private imageWrapper = signal<ElementRef<HTMLDivElement> | null>(null);

  public loading = signal(true);
  public kudosCost = signal<number | null>(null);
  public availableModels: WritableSignal<ModelConfigurations> = signal({});
  public liveModelDetails: WritableSignal<Record<string, number>> = signal({});
  public inProgress: WritableSignal<JobInProgress | null> = signal(null);
  public result: WritableSignal<Result[] | null> = signal(null);
  public requestStatus: WritableSignal<RequestStatusCheck | null> = signal(null);
  public groupedModels = computed(() => {
    const result: {[group: string]: ModelConfiguration[]} = {};
    for (const model of Object.values(this.availableModels())) {
      result[model.style] ??= [];
      result[model.style].push(model);
    }

    return result;
  });
  public customModels: Signal<ModelConfiguration[]> = computed(() => {
    const result: ModelConfiguration[] = [];
    for (const modelName of Object.keys(this.liveModelDetails())) {
      if (typeof this.availableModels()[modelName] !== 'undefined') {
        continue;
      }
      result.push({
        name: modelName,
        baseline: BaselineModel.StableDiffusion1,
        config: {
          download: [],
          files: [],
        },
        description: "",
        download_all: false,
        inpainting: false,
        nsfw: true,
        style: ModelStyle.CustomModel,
        type: ModelType.Ckpt,
        version: 'unknown'
      });
    }

    return result;
  });
  public validationErrors: WritableSignal<OptionsValidationErrors> = signal([]);
  public currentModelDetail: Signal<ModelConfiguration | null> = computed(() => this.availableModels()[this.currentModelName()] ?? null);
  public chosenStyle: WritableSignal<EnrichedPromptStyle | null> = signal(null);
  public modifiedOptions: Signal<null | Partial<GenerationOptions>> = computed(() => {
    if (this.chosenStyle() === null) {
      return null;
    }

    const style = this.chosenStyle()!;

    let promptParts = style.prompt.split('###');
    if (promptParts.length === 1) {
      promptParts = style.prompt.split('{np}');
      promptParts[1] = `{np}${promptParts[1] ?? ''}`;
    }

    const patch: Partial<GenerationOptions> = {
      prompt: promptParts[0].replace('{p}', this.currentPrompt()),
      negativePrompt: promptParts[1].replace('{np}', this.currentNegativePrompt() ?? ''),
      model: style.model,
    };
    if (style.height) {
      patch.height = style.height;
    }
    if (style.width) {
      patch.width = style.width;
    }
    if (style.cfg_scale) {
      patch.cfgScale = style.cfg_scale;
    }
    if (style.sampler_name) {
      patch.sampler = style.sampler_name;
    }
    if (style.steps) {
      patch.steps = style.steps;
    }
    if (style.loras?.length) {
      patch.loraList = style.loras.map(lora => ({
        isVersionId: lora.is_version,
        injectTrigger: lora.inject_trigger,
        strengthClip: lora.clip,
        strengthModel: lora.model,
        id: Number(lora.name),
      }));
    }

    return patch;
  });

  isOpenResult: boolean = false;
  toggleContent() {
    this.isOpenResult = !this.isOpenResult;
  }

  public effectiveModel = computed(() => this.modifiedOptions()?.model ?? this.currentModelName());

  public iconEdit = signal(faPencil);
  public iconDelete = signal(faRemove);
  public iconExternalLink = signal(faExternalLink);

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
    faceFixers: new FormControl<PostProcessor[]>([]),
    upscaler: new FormControl<PostProcessor | null>(null),
    genericPostProcessors: new FormControl<PostProcessor[]>([]),
    seed: new FormControl<string>(''),
    karras: new FormControl<boolean>(false),
    hiresFix: new FormControl<boolean>(false),
    faceFixerStrength: new FormControl<number>(0, [
      Validators.min(0),
      Validators.max(1),
    ]),
    nsfw: new FormControl<boolean>(false),
    slowWorkers: new FormControl<boolean>(false),
    censorNsfw: new FormControl<boolean>(false),
    trustedWorkers: new FormControl<boolean>(false),
    allowDowngrade: new FormControl<boolean>(false),
    clipSkip: new FormControl<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(12),
    ]),
    loraList: new FormControl<LoraGenerationOption[]>([], [
      Validators.maxLength(5),
    ]),
    onlyMyWorkers: new FormControl<boolean>(false),
    amount: new FormControl<number>(1),
    textualInversionList: new FormControl<TextualInversionGenerationOption[]>([]),
  });

  @ViewChild('swiperContainer', {static: false}) set swiperContainerChanged(container: ElementRef<HTMLDivElement> | undefined) {
    this.swiperContainer.set(container ?? null);
  }

  @ViewChild('swiperThumbsContainer', {static: false}) set swiperThumbsContainerChanged(container: ElementRef<HTMLDivElement> | undefined) {
    this.swiperThumbsContainer.set(container ?? null);
  }

  @ViewChild('imageWrapper', {static: false}) set imageWrapperChanged(wrapper: ElementRef<HTMLDivElement> | undefined) {
    this.imageWrapper.set(wrapper ?? null);
  }

  constructor(
    private readonly database: DatabaseService,
    private readonly costCalculator: KudosCostCalculator,
    private readonly api: AiHorde,
    private readonly messageService: MessageService,
    private readonly translator: TranslatorService,
    private readonly httpClient: HttpClient,
    private readonly dataStorage: DataStorageManagerService,
    private readonly hordeRepoData: HordeRepoDataService,
    private readonly generationOptionsValidator: GenerationOptionsValidatorService,
    private readonly modalService: ModalService,
    private readonly civitAi: CivitAiService,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) platformId: string,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    let firstChosenStyleLoad = true;
    effect(() => {
      const style = this.chosenStyle();
      if (firstChosenStyleLoad) {
        firstChosenStyleLoad = false;
        return;
      }

      this.database.setSetting({
        setting: 'chosen_style',
        value: style,
      });
    });

    // swiper
    effect(() => {
      if (!this.viewInitialized()) {
        return;
      }
      if (this.loading() || !this.result() || !this.swiperContainer() || !this.swiperThumbsContainer()) {
        this.destroySwiper();
        return;
      }

      this.initializeSwiper();
      this.initializeSwiperThumbs();
    });
  }

  public async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    // for these two we need even the initial values, that's why there are multiple listeners
    this.form.valueChanges.subscribe(changes => {
      if (typeof changes.prompt === 'string') {
        this.currentPrompt.set(changes.prompt);
      }
      if (typeof changes.negativePrompt === 'string') {
        this.currentNegativePrompt.set(changes.negativePrompt);
      }
    });

    const storage = await this.dataStorage.currentStorage;
    const storedOptions = await storage.getGenerationOptions();
    this.form.patchValue(storedOptions);
    this.form.patchValue({
      faceFixers: getFaceFixers(storedOptions.postProcessors),
      upscaler: getUpscalers(storedOptions.postProcessors)[0] ?? null,
      genericPostProcessors: getGenericPostProcessors(storedOptions.postProcessors),
    });

    this.activatedRoute.queryParamMap.subscribe(paramMap => {
      if (paramMap.has('request')) {
        const base64 = paramMap.get('request')!;
        const decoded = new TextDecoder().decode(toByteArray(base64));
        const request = JSON.parse(decoded) as ExternalRequest;
        this.form.patchValue(request.request);
        if (request.seed) {
          this.form.patchValue({seed: request.seed});
        }
      }
    });

    this.inProgress.set((await this.database.getJobsInProgress())[0] ?? null);
    if (this.form.valid) {
      this.costCalculator.calculate(this.formAsOptionsStyled).then(result => {
        this.kudosCost.set(result);
      });
    }
    this.form.valueChanges.pipe(
      startWith(this.form.value),
      pairwise(),
    ).subscribe(async changeSet => {
      const changes = changeSet[1];
      const old = changeSet[0];

      this.kudosCost.set(null);
      if (changes.model) {
        this.currentModelName.set(changes.model);
        this.validationErrors.set(await this.generationOptionsValidator.getModelValidationStatus(this.formAsOptions, changes.model));
      }
      if (changes.model !== old.model) {
        await this.database.removeSetting('lora_bases_modified');
      }
    });
    this.form.valueChanges.pipe(
      debounceTime(400),
      startWith(this.form.value),
      pairwise(),
    ).subscribe(async changeSet => {
      const changes = changeSet[1];
      const old = changeSet[0];

      if (this.form.valid) {
        this.kudosCost.set(await this.costCalculator.calculate(this.formAsOptionsStyled));
        if (this.kudosCost() === null) {
          await this.messageService.error(this.translator.get('app.error.kudos_calculation'));
        }
      } else {
        this.kudosCost.set(0);
      }

      if (!_.isMatch(changes, old)) {
        await storage.storeGenerationOptions(this.formAsOptions);
      }
    });
    this.availableModels.set(await toPromise(this.hordeRepoData.getModelsConfig()));
    this.liveModelDetails.set(await toPromise(this.api.getModels().pipe(
      map (response => {
        if (!response.success) {
          this.messageService.error(this.translator.get('app.error.models_fetching_failed'));
          throw new Error("Failed fetching list of models");
        }

        const models = response.successResponse!
          .filter(model => model.type === WorkerType.image)

        const results: Record<string, number> = {};

        for (const model of models) {
          results[model.name] = model.count;
        }

        return results;
      }),
    )));
    this.chosenStyle.set((await this.database.getSetting<EnrichedPromptStyle | null>('chosen_style', null)).value)
    this.loading.set(false);

    this.checkInterval ??= interval(1_000).subscribe(async () => {
      if (!this.inProgress()) {
        return;
      }

      const response = await toPromise(this.api.checkGenerationStatus(this.inProgress()!));
      if (!response.success) {
        await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
        await this.database.deleteInProgressJob(this.inProgress()!);
        this.inProgress.set(null);
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

  public async ngAfterViewInit(): Promise<void> {
    this.viewInitialized.set(true);
  }

  public async ngOnDestroy(): Promise<void> {
    this.checkInterval?.unsubscribe();
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
      for (const image of this.result()!) {
        URL.revokeObjectURL(image.source);
      }
    }
    this.result.set(null);
    const response = await toPromise(this.api.generateImage(this.formAsOptionsStyled));
    if (!response.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
      this.loading.set(false);
      return;
    }

    await this.database.addInProgressJob(response.successResponse!);
    await this.database.storeJobMetadata({
      requestId: response.successResponse!.id,
      ...this.formAsOptionsStyled,
    });
    this.inProgress.set(response.successResponse!);
    this.loading.set(false);

    const subscription = interval(50).subscribe(() => {
      if (this.imageWrapper()) {
        const boundingRect = this.imageWrapper()!.nativeElement.getBoundingClientRect();
        if (
          boundingRect.top >= 0
          && boundingRect.left >= 0
          && boundingRect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
          && boundingRect.right <= (window.innerWidth || document.documentElement.clientWidth)
        ) {
          subscription.unsubscribe();
          return;
        }
        window.scrollTo({left: 0, top: boundingRect.top + document.documentElement.scrollTop});
        subscription.unsubscribe();
      }
    });
  }

  private get formAsOptions(): GenerationOptions {
    const value = this.form.value;
    if (<string>value.upscaler === 'null') {
      value.upscaler = null;
    }

    let postProcessors: PostProcessor[] = getFaceFixers(value.faceFixers ?? []);
    if (value.upscaler) {
      postProcessors.push(value.upscaler);
    }
    postProcessors = postProcessors.concat(value.genericPostProcessors ?? []);
    postProcessors = postProcessors.filter((processor, index) => postProcessors.indexOf(processor) === index);

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
      karras: value.karras ?? true,
      postProcessors: postProcessors,
      seed: value.seed || null,
      hiresFix: value.hiresFix ?? false,
      faceFixerStrength: value.faceFixerStrength ?? 0.75,
      nsfw: value.nsfw ?? false,
      censorNsfw: value.censorNsfw ?? false,
      slowWorkers: value.slowWorkers ?? true,
      trustedWorkers: value.trustedWorkers ?? false,
      allowDowngrade: value.allowDowngrade ?? false,
      clipSkip: value.clipSkip ?? 1,
      loraList: value.loraList ?? [],
      styleName: this.chosenStyle()?.name ?? null,
      onlyMyWorkers: value.onlyMyWorkers ?? false,
      amount: value.amount ?? 1,
      textualInversionList: value.textualInversionList ?? [],
    };
  }

  private get formAsOptionsStyled(): GenerationOptions {
    if (!this.modifiedOptions()) {
      return this.formAsOptions;
    }

    return {...this.formAsOptions, ...this.modifiedOptions()};
  }

  private async downloadImages(result: RequestStatusFull, metadata: JobMetadata): Promise<void> {
    const generations = result.generations;
    const promises: Array<Promise<HttpResponse<Blob>>> = [];
    for (const generation of generations) {
      promises.push(toPromise(this.httpClient.get(generation.img, {observe: 'response', responseType: 'blob'})));
    }
    const responses = await Promise.all(promises);

    const storage = await this.dataStorage.currentStorage;
    const storeImagePromises: Promise<StoredImage>[] = [];
    const results: Result[] = [];
    let i = 0;
    for (const response of responses) {
      ++i;
      let image = response.body;
      if (image === null) {
        await this.messageService.error(this.translator.get('app.error.image_download_failed', {index: i}));
        continue;
      }

      const format = (await this.database.getSetting('image_format', OutputFormat.Png)).value;
      if (format === OutputFormat.Png) {
        const webp = decodeWebP({
          data: new Uint8Array(await image.arrayBuffer()),
        });
        let out = encodePng({
          image: webp!,
        });
        out = addMetadata(out, "generationMetadata", JSON.stringify({
          id: generations[i - 1].id,
          worker: {
            id: generations[i - 1].worker_id,
            name: generations[i - 1].worker_name,
          },
          ...metadata,
          model: generations[i - 1].model,
          seed: generations[i - 1].seed,
          generator: 'HordeNG (https://horde-ng.org)'
        }));
        image = new Blob([out], { type: 'image/png' });
      }

      results.push({
        source: URL.createObjectURL(image),
        width: metadata.width,
        height: metadata.height,
        workerId: generations[i - 1].worker_id,
        model: generations[i - 1].model,
        censored: generations[i - 1].censored,
        workerName: generations[i - 1].worker_name,
        seed: generations[i - 1].seed,
        id: generations[i - 1].id,
        kudos: result.kudos,
        postProcessors: metadata.postProcessors.join(', '),
        prompt: metadata.prompt,
      });

      const storeData: UnsavedStoredImage = {
        id: generations[i - 1].id,
        data: image,
        worker: {
          id: generations[i - 1].worker_id,
          name: generations[i - 1].worker_name,
        },
        ...metadata,
        model: generations[i - 1].model,
        seed: generations[i - 1].seed,
        format: format,
      };
      storeImagePromises.push(storage.storeImage(storeData));
    }
    const storedImages = await Promise.all(storeImagePromises);
    await storage.storeImagesInCache(...storedImages);
    await this.database.removeJobMetadata(metadata);
    this.result.set(results);
  }

  public async cancelGeneration(): Promise<void> {
    const job = this.inProgress();
    if (!job) {
      return;
    }

    await this.database.deleteInProgressJob(job);
    this.inProgress.set(null);
    await toPromise(this.api.cancelJob(job));
  }

  public async openModal(modal: TemplateRef<any>) {
    this.modalService.open(modal);
  }

  public async applyStyleDirectly(): Promise<void> {
    this.form.patchValue(this.modifiedOptions()!);
    this.chosenStyle.set(null);
  }

  public async applyStyle(style: EnrichedPromptStyle): Promise<void> {
    this.chosenStyle.set(style);
    if (this.form.valid) {
      await this.costCalculator.calculate(this.formAsOptionsStyled);
    }
  }

  public async removeLora(modelId: number): Promise<void> {
    const loras = this.form.value.loraList ?? [];
    this.form.patchValue({
      loraList: loras.filter(lora => lora.id !== modelId),
    });
  }

  public async addLora(lora: LoraGenerationOption) {
    const loras = this.form.value.loraList ?? [];
    loras.push(lora);
    this.form.patchValue({
      loraList: loras,
    });
    await this.modalService.close();
  }

  public async download(result: Result) {
    const response = await fetch(result.source);
    const blob = await response.blob();

    const format = (await this.database.getSetting('image_format', OutputFormat.Png)).value;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    this.document.body.appendChild(a);
    a.href = url;
    a.download = `${result.prompt}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  public async loraUpdated(result: ConfigureLoraResult): Promise<void> {
    const loras = this.form.value.loraList ?? [];
    for (const lora of loras) {
      const versionId = lora.isVersionId ? lora.id : (await toPromise(this.civitAi.getModelDetail(lora.id))).modelVersions[0].id;
      if (versionId === result.versionId) {
        lora.strengthModel = result.model;
        lora.strengthClip = result.clip;
        break;
      }
    }
    this.form.patchValue({
      loraList: loras,
    });
  }

  public async resetForm(): Promise<void> {
    this.form.patchValue(DefaultGenerationOptions);
    this.form.patchValue({
      faceFixers: [],
      genericPostProcessors: [],
      upscaler: null,
    });
    this.result.set(null);
    this.requestStatus.set(null);
    this.chosenStyle.set(null);
  }

  private initializeSwiper(): void {
    this.swiper = new Swiper(this.swiperContainer()!.nativeElement, {
      modules: [Navigation, Pagination, Thumbs],
      slidesPerView: 1,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      }
    });

    this.swiper.on('slideChange', () => {
      this.swiperThumbs!.slideTo(this.swiper!.activeIndex);
    });
  }

  private initializeSwiperThumbs(): void {
    this.swiperThumbs = new Swiper(this.swiperThumbsContainer()!.nativeElement, {
      slidesPerView: 5,
      centerInsufficientSlides: true,
      freeMode: true,
      spaceBetween: 5,
      watchSlidesProgress: true,
      breakpoints: {
        576: {
          slidesPerView: 5,
        },
        0: {
          slidesPerView: 4,
        }
      },
    });

    this.swiperThumbs.on('click', () => {
      this.swiper!.slideTo(this.swiperThumbs!.clickedIndex);
    });
  }

  private destroySwiper(): void {
    this.swiper?.destroy();
    this.swiperThumbs?.destroy();

    this.swiper = null;
    this.swiperThumbs = null;
  }

  public async onTextualInversionsUpdated(textualInversions: TextualInversionGenerationOption[]) {
    this.form.patchValue({
      textualInversionList: textualInversions,
    });
  }
}
