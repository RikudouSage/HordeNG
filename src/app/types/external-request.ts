import {Sampler} from "./horde/sampler";
import {PostProcessor} from "./horde/post-processor";

export interface ExternalRequest {
  request: {
    cfgScale: number;
    clipSkip: number;
    height: number;
    karras: boolean;
    model: string;
    negativePrompt: string;
    nsfw: boolean;
    prompt: string;
    sampler: Sampler;
    steps: number;
    upscaler: PostProcessor;
    width: number;
  };
  seed: string;
}
