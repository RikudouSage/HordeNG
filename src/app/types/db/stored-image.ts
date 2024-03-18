import {GenerationOptions} from "./generation-options";

export interface UnsavedStoredImage extends GenerationOptions {
  id?: string;
  data: Blob;
  worker: {
    id: string;
    name: string;
  };
  model: string;
  seed: string;
}

export interface StoredImage extends UnsavedStoredImage {
  id: string;
}
