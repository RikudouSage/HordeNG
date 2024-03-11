import {WorkerType} from "./worker-type";

export interface ActiveModel {
  name: string;
  count: number;
  performance: number;
  queued: number;
  eta: number;
  type: WorkerType;
}
