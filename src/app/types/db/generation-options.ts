import {Sampler} from "../horde/sampler";
import {PostProcessor} from "../horde/post-processor";
import {QrCodeComponentValue} from "../../pages/generate-image/parts/qr-code-form/qr-code-form.component";

export interface LoraGenerationOption {
  id: number;
  strengthModel?: number;
  strengthClip?: number;
  injectTrigger?: string;
  isVersionId?: boolean;
}

export type TextualInversionInjectType = 'prompt' | 'negative';

export interface TextualInversionGenerationOption {
  id: number;
  inject?: TextualInversionInjectType;
  strength?: number;
}

export interface GenerationOptions {
  prompt: string;
  negativePrompt: string | null;
  seed: string | null;
  sampler: Sampler;
  cfgScale: number;
  denoisingStrength: number;
  height: number;
  width: number;
  steps: number;
  model: string;
  karras: boolean;
  postProcessors: PostProcessor[];
  hiresFix: boolean;
  faceFixerStrength: number;
  nsfw: boolean;
  slowWorkers: boolean;
  censorNsfw: boolean;
  trustedWorkers: boolean;
  allowDowngrade: boolean;
  clipSkip: number;
  loraList: LoraGenerationOption[];
  textualInversionList: TextualInversionGenerationOption[];
  styleName: string | null;
  onlyMyWorkers: boolean;
  amount: number;
  qrCode: QrCodeComponentValue | null;
  transparent: boolean;
  extraSlowWorkers: boolean;
  replacementFilter: boolean;
}

export const DefaultGenerationOptions: GenerationOptions = {
  prompt: '',
  negativePrompt: null,
  seed: null,
  sampler: Sampler.k_dpmpp_sde,
  cfgScale: 5,
  denoisingStrength: 0.75,
  height: 512,
  width: 512,
  steps: 25,
  model: 'AlbedoBase XL (SDXL)',
  karras: true,
  postProcessors: [],
  hiresFix: false,
  faceFixerStrength: 0.75,
  nsfw: false,
  slowWorkers: true,
  censorNsfw: false,
  trustedWorkers: false,
  allowDowngrade: false,
  clipSkip: 1,
  loraList: [],
  textualInversionList: [],
  styleName: null,
  onlyMyWorkers: false,
  amount: 1,
  qrCode: null,
  transparent: false,
  extraSlowWorkers: false,
  replacementFilter: true,
};
