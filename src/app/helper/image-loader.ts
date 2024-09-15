import {PaginatedResult} from "../types/paginated-result";
import {StoredImage} from "../types/db/stored-image";
import {Observable} from "rxjs";
import {ProgressUpdater} from "./progress-updater";

export interface ImageLoader {
  isLocal: boolean;
  result: Promise<PaginatedResult<StoredImage>>;
  progressUpdater: Observable<ProgressUpdater>;
}
