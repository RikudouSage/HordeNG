import {CivitAiModelVersionFile} from "./civit-ai-model-version-file";
import {CivitAiModelVersionImage} from "./civit-ai-model-version-image";
import {CivitAiModelVersionStats} from "./civit-ai-model-version-stats";

export interface CivitAiModelVersion {
  id: number;
  name: string;
  status: string;
  baseModel: string;
  createdAt: string;
  description: string | null;
  publishedAt: string;
  stats: CivitAiModelVersionStats;
  files: CivitAiModelVersionFile[];
  images: CivitAiModelVersionImage[];
  downloadUrl: string;
}
