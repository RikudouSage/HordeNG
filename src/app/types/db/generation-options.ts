import {Sampler} from "../horde/sampler";
import {PostProcessor} from "../horde/post-processor";

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
}
