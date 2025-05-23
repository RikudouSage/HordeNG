import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
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
import {TranslocoPipe} from "@jsverse/transloco";
import {AsyncPipe, DOCUMENT, isPlatformBrowser, KeyValuePipe} from "@angular/common";
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
import {AspectRatioComponent} from "../../components/aspect-ratio/aspect-ratio.component";
import {ActivatedRoute} from "@angular/router";
import {toByteArray} from "base64-js";
import {ExternalRequest} from "../../types/external-request";
import {TextualInversionsComponent} from "./parts/textual-inversions/textual-inversions.component";
import {OutputFormat} from "../../types/output-format";
import {QrCodeComponentValue, QrCodeFormComponent} from "./parts/qr-code-form/qr-code-form.component";
import {convertToJpeg, convertToPng} from "../../helper/image-converter";
import {Unsubscribable} from "../../types/unsubscribable";
import {CensorshipService} from "../../services/censorship.service";

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
    TranslocoMarkupComponent,
    TomSelectDirective,
    ToggleCheckboxComponent,
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
    AspectRatioComponent,
    TextualInversionsComponent,
    QrCodeFormComponent
  ],
  templateUrl: './generate-image.component.html',
  styleUrl: './generate-image.component.scss'
})
export class GenerateImageComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly convertToPngJobName: string = 'convertToPng';
  private readonly convertToJpegJobName: string = 'convertToJpeg';

  private readonly isBrowser: boolean;

  protected readonly Sampler = Sampler;
  protected readonly PostProcessor = PostProcessor;
  protected readonly OptionsValidationError = OptionsValidationError;
  protected readonly BaselineModel = BaselineModel;

  private checkInterval: Subscription | null = null;
  private swiper: Swiper | null = null;
  private swiperThumbs: Swiper | null = null;
  private readonly worker: Worker | null = null;
  private convertImageWorkerResponse: Blob | null = null;

  private currentModelName: WritableSignal<string> = signal('');
  private currentPrompt: WritableSignal<string> = signal('');
  private currentNegativePrompt: WritableSignal<string | null> = signal(null);

  private viewInitialized = signal(false);
  private swiperContainer = signal<ElementRef<HTMLDivElement> | null>(null);
  private swiperThumbsContainer = signal<ElementRef<HTMLDivElement> | null>(null);
  private imageWrapper = signal<ElementRef<HTMLDivElement> | null>(null);

  public nsfwCensored = this.censorshipService.nsfwCensored;
  public loading = signal(true);
  public loaderText = signal('');
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
    qrCode: new FormControl<QrCodeComponentValue | null>(null),
    transparent: new FormControl<boolean>(false),
    extraSlowWorkers: new FormControl<boolean>(false),
    replacementFilter: new FormControl<boolean>(true),
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
    private readonly censorshipService: CensorshipService,
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

    effect(() => {
      if (this.nsfwCensored()) {
        this.form.patchValue({
          nsfw: false,
          censorNsfw: true,
        });
        this.form.controls.nsfw.disable();
        this.form.controls.censorNsfw.disable();
      }
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

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./generate-image.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data.type === this.convertToPngJobName || data.type === this.convertToJpegJobName) {
          this.convertImageWorkerResponse = data.result;
        }
      };
    }
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
        if (request.model) {
          this.form.patchValue({model: request.model});
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

    let errors = 0;
    let wait = 0;
    this.checkInterval ??= interval(2_000).subscribe(async () => {
      if (!this.inProgress()) {
        return;
      }

      if (wait) {
        --wait;
        return;
      }

      if (errors > 5) {
        const job = this.inProgress()!;
        this.inProgress.set(null);
        await Promise.all([
          this.messageService.error(this.translator.get('app.error.too_many_api_errors')),
          this.database.deleteInProgressJob(job),
          this.finalizeGenerationLoop(job),
        ]);
        return;
      }

      const response = await toPromise(this.api.checkGenerationStatus(this.inProgress()!));
      if (!response.success) {
        if (response.statusCode === 429) {
          return; // too many requests, just chill
        }
        await this.messageService.error(this.translator.get('app.error.api_error', {message: response.errorResponse!.message, code: response.errorResponse!.rc}));
        wait = 3;
        ++errors;
        return;
      }
      errors = 0;

      const status = response.successResponse!;
      this.requestStatus.set(status);

      if (!status.is_possible) {
        const job = this.inProgress()!;
        this.inProgress.set(null);

        await Promise.all([
          this.finalizeGenerationLoop(job),
          toPromise(this.api.cancelJob(job)),
          this.database.deleteInProgressJob(job),
        ]);

        await this.messageService.error(this.translator.get('app.error.generate.impossible'));
        return;
      }

      if (status.done) {
        this.loading.set(true);
        const job = this.inProgress() ?? (await this.database.getJobsInProgress())[0] ?? null;
        this.inProgress.set(null);
        await this.database.deleteInProgressJob(job);
        if (job === null) {
          return;
        }

        await this.finalizeGenerationLoop(job);
      }
    });
  }

  private async finalizeGenerationLoop(job: JobInProgress): Promise<void> {
    this.loading.set(true);
    const resultResponse = await toPromise(this.api.getGeneratedImageResult(job));
    if (!resultResponse.success) {
      await this.messageService.error(this.translator.get('app.error.api_error', {message: resultResponse.errorResponse!.message, code: resultResponse.errorResponse!.rc}));
      this.loading.set(false);
      return;
    }

    const result = resultResponse.successResponse!;

    if (!result.generations.length) {
      this.loading.set(false);
      return;
    }

    const metadata = (await this.database.getJobMetadata(job))!;
    await this.downloadImages(result, metadata);

    this.loading.set(false);
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
      this.scrollToImage(subscription);
    });
  }

  private scrollToImage(subscription: Unsubscribable | null) {
    if (this.imageWrapper()) {
      const boundingRect = this.imageWrapper()!.nativeElement.getBoundingClientRect();
      if (
        boundingRect.top >= 0
        && boundingRect.left >= 0
        && boundingRect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        && boundingRect.right <= (window.innerWidth || document.documentElement.clientWidth)
      ) {
        subscription?.unsubscribe();
        return;
      }
      window.scrollTo({left: 0, top: boundingRect.top + document.documentElement.scrollTop});
      subscription?.unsubscribe();
    }
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
    postProcessors = postProcessors.filter(processor => <string>processor !== '');

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
      nsfw: this.nsfwCensored() ? false : (value.nsfw ?? false),
      censorNsfw: this.nsfwCensored() ? true : (value.censorNsfw ?? false),
      slowWorkers: value.slowWorkers ?? true,
      trustedWorkers: value.trustedWorkers ?? false,
      allowDowngrade: value.allowDowngrade ?? false,
      clipSkip: value.clipSkip ?? 1,
      loraList: value.loraList ?? [],
      styleName: this.chosenStyle()?.name ?? null,
      onlyMyWorkers: value.onlyMyWorkers ?? false,
      amount: value.amount ?? 1,
      textualInversionList: value.textualInversionList ?? [],
      qrCode: value.qrCode ?? null,
      transparent: value.transparent ?? false,
      extraSlowWorkers: value.extraSlowWorkers ?? false,
      replacementFilter: value.replacementFilter ?? true,
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
      const generationMetadata = {
        id: generations[i - 1].id,
        worker: {
          id: generations[i - 1].worker_id,
          name: generations[i - 1].worker_name,
        },
        ...metadata,
        model: generations[i - 1].model,
        seed: generations[i - 1].seed,
        generator: 'HordeNG (https://horde-ng.org)'
      };
      const text = await toPromise(this.translator.get('app.generate.loader_text.converting', {format: format}));
      if (format === OutputFormat.Png) {
        this.loaderText.set(text)
        image = await this.convertToPng(image, generationMetadata);
      } else if (format === OutputFormat.Jpeg) {
        this.loaderText.set(text)
        image = await this.convertToJpeg(image, generationMetadata);
      }
      this.loaderText.set('');

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

    this.loaderText.set(await toPromise(this.translator.get('app.generate.loader_text.uploading')));
    const storedImages = await Promise.all(storeImagePromises);
    this.loaderText.set('');

    await storage.storeImagesInCache(...storedImages);
    await this.database.removeJobMetadata(metadata);
    this.result.set(results);

    const subscription = interval(50).subscribe(() => {
      this.scrollToImage(subscription);
    });
  }

  public async cancelGeneration(): Promise<void> {
    const job = this.inProgress();
    this.inProgress.set(null);
    if (!job) {
      return;
    }

    await Promise.all([
      this.database.deleteInProgressJob(job),
      toPromise(this.api.cancelJob(job)),
      this.finalizeGenerationLoop(job),
    ]);
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

  private async convertToPng(image: Blob, generationsMetadata: any): Promise<Blob> {
    if (this.worker) {
      this.worker.postMessage({
        type: this.convertToPngJobName,
        data: await image.arrayBuffer(),
        generationMetadata: generationsMetadata,
      });
      return await new Promise<Blob>(resolve => {
        const subscription = interval(2000).subscribe(() => {
          if (this.convertImageWorkerResponse !== null) {
            subscription.unsubscribe();
            resolve(this.convertImageWorkerResponse);
            this.convertImageWorkerResponse = null;
          }
        });
      });
    } else {
      return await convertToPng(image, generationsMetadata);
    }
  }

  private async convertToJpeg(image: Blob, generationMetadata: any) {
    if (this.worker) {
      this.worker.postMessage({
        type: this.convertToJpegJobName,
        data: await image.arrayBuffer(),
        generationMetadata: generationMetadata,
      });
      return await new Promise<Blob>(resolve => {
        const subscription = interval(2000).subscribe(() => {
          if (this.convertImageWorkerResponse !== null) {
            subscription.unsubscribe();
            resolve(this.convertImageWorkerResponse);
            this.convertImageWorkerResponse = null;
          }
        });
      });
    } else {
      return await convertToJpeg(image, generationMetadata);
    }
  }

  @HostListener('window:keydown.control.enter', ['$event'])
  public async onCtrlEnterPressed(event: KeyboardEvent) {
    event.preventDefault();
    await this.generateImage();
  }
}
