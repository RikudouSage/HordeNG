import {GenerationMetadataType} from "./generation-metadata-type";
import {GenerationMetadataValue} from "./generation-metadata-value";

export interface GenerationMetadata {
  type: GenerationMetadataType;
  value: GenerationMetadataValue;
  ref: string;
}
