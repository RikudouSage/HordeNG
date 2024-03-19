import {CivitAiModelType} from "./civit-ai-model-type";
import {CivitAiModelMode} from "./civit-ai-model-mode";
import {CivitAiCreator} from "./civit-ai-creator";
import {CivitAiModelStats} from "./civit-ai-model-stats";
import {CivitAiModelVersion} from "./civit-ai-model-version";

export interface CivitAiModel {
  id: number;
  name: string;
  description: string;
  poi: boolean;
  allowNoCredit: boolean;
  allowCommercialUse: string[];
  allowDerivatives: boolean;
  allowDifferentLicense: boolean;
  type: CivitAiModelType;
  nsfw: boolean;
  tags: string[];
  mode: CivitAiModelMode | null;
  creator: CivitAiCreator;
  stats: CivitAiModelStats;
  modelVersions: CivitAiModelVersion[];
}
