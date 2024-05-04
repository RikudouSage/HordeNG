import {CivitAiModel} from "./civit-ai-model";
import {CivitAiResponseMetadata} from "./civit-ai-response-metadata";

export interface ModelSearchResponse {
  items: CivitAiModel[];
  metadata: CivitAiResponseMetadata;
}
