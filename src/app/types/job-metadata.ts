import {GenerationOptions} from "./db/generation-options";

export interface JobMetadata extends GenerationOptions {
  requestId: string;
}
