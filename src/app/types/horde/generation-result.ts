import {GenerationMetadata} from "./generation-metadata";

export interface GenerationResult {
  worker_id: string;
  worker_name: string;
  model: string;
  img: string;
  seed: string;
  id: string;
  censored: boolean;
  gen_metadata: GenerationMetadata[];
}
