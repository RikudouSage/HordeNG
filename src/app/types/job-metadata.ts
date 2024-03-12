import {PostProcessor} from "./horde/post-processor";

export interface JobMetadata {
  requestId: string;
  width: number;
  height: number;
  postProcessors: PostProcessor[];
}
