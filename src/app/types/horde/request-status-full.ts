import {RequestStatusCheck} from "./request-status-check";
import {GenerationResult} from "./generation-result";

export interface RequestStatusFull extends RequestStatusCheck {
  shared: boolean;
  generations: GenerationResult[];
}
