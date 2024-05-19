import {GenerationOptions} from "./generation-options";
import {OutputFormat} from "../output-format";

export interface UnsavedStoredImage extends GenerationOptions {
  id?: string;
  data: Blob;
  worker: {
    id: string;
    name: string;
  };
  model: string;
  seed: string;
  format: OutputFormat;
}

export interface StoredImage extends UnsavedStoredImage {
  id: string;
}
