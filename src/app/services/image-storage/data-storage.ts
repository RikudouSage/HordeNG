import {Credentials} from "../../types/credentials/credentials";
import {Resolvable} from "../../helper/resolvable";
import {StoredImage, UnsavedStoredImage} from "../../types/db/stored-image";
import {GenerationOptions} from "../../types/db/generation-options";
import {ImageLoader} from "../../helper/image-loader";

export interface DataStorage<TCredentials extends Credentials> {
  get name(): string;
  get displayName(): Resolvable<string>;
  validateCredentials(credentials: TCredentials): Promise<boolean | string>;
  storeImage(image: UnsavedStoredImage): Promise<StoredImage>;
  storeImagesInCache(...image: StoredImage[]): Promise<void>;
  loadImages(page: number, perPage: number): ImageLoader | Promise<ImageLoader>;
  deleteImage(image: StoredImage): Promise<void>;
  storeOption(option: string, value: any): Promise<void>;
  getOption<T>(option: string, defaultValue: T): Promise<T>;
  getOption<T>(option: string): Promise<T | undefined>;
  getSize(): Promise<number | null>;
  getGenerationOptions(): Promise<GenerationOptions>;
  storeGenerationOptions(options: GenerationOptions): Promise<void>;
}
