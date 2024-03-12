import {Sampler} from "../horde/sampler";
import {PostProcessor} from "../horde/post-processor";

export interface GenerationOptions {
  prompt: string;
  negativePrompt: string | null;
  sampler: Sampler;
  cfgScale: number;
  denoisingStrength: number;
  height: number;
  width: number;
  steps: number;
  model: string;
  karras: boolean;
  postProcessors: PostProcessor[];
}
