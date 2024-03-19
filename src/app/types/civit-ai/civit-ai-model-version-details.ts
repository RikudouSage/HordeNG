import {CivitAiModelVersion} from "./civit-ai-model-version";

export interface CivitAiModelVersionDetails extends CivitAiModelVersion {
  modelId: number;
  updatedAt: string;
  trainedWords: string[];
  trainingStatus: string | null;
  trainingDetails: any; // todo
  baseModelType: any; // todo
  earlyAccessTimeFrame: number;
  model: {
    name: string;
    type: string;
    nsfw: boolean;
    poi: boolean;
  }
}
