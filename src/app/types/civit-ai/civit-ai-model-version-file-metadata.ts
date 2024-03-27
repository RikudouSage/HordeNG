import {CivitAiFp} from "./civit-ai-fp";
import {CivitAiModelSize} from "./civit-ai-model-size";
import {CivitAiModelFormat} from "./civit-ai-model-format";

export interface CivitAiModelVersionFileMetadata {
  fp: CivitAiFp | null;
  size: CivitAiModelSize | null;
  format: CivitAiModelFormat | null;
}
