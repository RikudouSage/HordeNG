import {CivitAiScanResult} from "./civit-ai-scan-result";
import {CivitAiModelVersionFileMetadata} from "./civit-ai-model-version-file-metadata";

export interface CivitAiModelVersionFile {
  id: number;
  sizeKb: number;
  name: string;
  type: string;
  pickleScanResult: CivitAiScanResult;
  pickleScanMessage: string | null;
  virusScanResult: CivitAiScanResult;
  virusScanMessage: string | null;
  scannedAt: string | null;
  primary?: boolean;
  metadata: CivitAiModelVersionFileMetadata;
  downloadUrl: string;
  hashes: {[key: string]: string};
}
