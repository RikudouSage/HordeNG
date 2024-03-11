import {Sampler} from "../horde/sampler";

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
}
