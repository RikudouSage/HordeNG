import {CivitAiModel} from "./civit-ai-model";
import {CivitAiResponseMetadata} from "./civit-ai-response-metadata";

export interface LoraSearchResponse {
  items: CivitAiModel[];
  metadata: CivitAiResponseMetadata;
}
