import {GenerationOptions} from "./db/generation-options";

export interface ExternalRequest {
  request: Partial<GenerationOptions>;
  seed: string;
}
