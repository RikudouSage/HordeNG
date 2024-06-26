import {WorkerType} from "./worker-type";
import {WorkerKudosDetails} from "./worker-kudos-details";
import {TeamDetailsLite} from "./team-details-lite";

export interface WorkerDetails {
  type: WorkerType;
  name: string;
  id: string;
  online: boolean;
  requests_fulfilled: number;
  kudos_rewards: number;
  kudos_details: WorkerKudosDetails;
  performance: string;
  threads: number;
  uptime: number;
  maintenance_mode: boolean;
  paused: boolean;
  info: string;
  nsfw: boolean;
  owner: string;
  ipaddr: string;
  trusted: boolean;
  flagged: boolean;
  suspicious: number;
  uncompleted_jobs: number;
  models: string[];
  forms: string[];
  team: TeamDetailsLite;
  contact: string;
  bridge_agent: string;
  max_pixels: number;
  megapixelsteps_generated: number;
  img2img: boolean;
  painting: boolean;
  'post-processing': boolean;
  lora: boolean;
  max_length: number;
  max_context_length: number;
}
