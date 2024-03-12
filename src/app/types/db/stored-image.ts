import {PostProcessor} from "../horde/post-processor";

export interface UnsavedStoredImage {
  id?: string;
  data: Blob;
  worker: {
    id: string;
    name: string;
  };
  model: string;
  seed: string;
  loras: string[];
  postProcessors: PostProcessor[];
}

export interface StoredImage extends UnsavedStoredImage {
  id: string;
}
