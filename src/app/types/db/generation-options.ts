import {Sampler} from "../horde/sampler";
import {PostProcessor} from "../horde/post-processor";

export interface LoraGenerationOption {
  id: number;
  strengthModel?: number;
  strengthClip?: number;
  injectTrigger?: string;
  isVersionId?: boolean;
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
  styleName: string | null;
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
  styleName: null,
};
