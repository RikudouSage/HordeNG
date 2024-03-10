export interface UnsavedStoredImage {
  data: Blob;
  worker: {
    id: string;
    name: string;
  };
  model: string;
  seed: string;
  loras: string[];
}

export interface StoredImage extends UnsavedStoredImage {
  id: string;
}
