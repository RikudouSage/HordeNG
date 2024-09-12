import {BaselineModel} from "./baseline-model";
import {ModelType} from "./model-type";
import {ModelStyle} from "./model-style";
import {Sampler} from "../horde/sampler";
import {ModelOptimization} from "./model-optimization";

export interface ModelFile {
  path: string;
  md5sum?: string;
  sha256sum?: string;
}

export interface ModelDownloadFile {
  file_name: string;
  file_path: string;
  file_url: string;
}

export interface ModelConfigurationConfig {
  files: ModelFile[];
  download: ModelDownloadFile[];
}

export interface ModelRequirements {
  min_steps?: number;
  max_steps?: number;
  cfg_scale?: number;
  samplers?: Sampler[],
  schedulers?: 'karras'[];
  clip_skip?: number;
  min_cfg_scale?: number;
  max_cfg_scale?: number;
}

export interface ModelConfiguration {
  name: string;
  baseline: BaselineModel;
  type: ModelType;
  inpainting: boolean;
  description: string;
  showcases?: string[];
  version: string;
  style: ModelStyle;
  nsfw: boolean;
  download_all: boolean;
  config: ModelConfigurationConfig;
  available?: boolean;
  size_on_disk_bytes?: number;
  homepage?: string;
  features_not_supported?: string[];
  requirements?: ModelRequirements;
  optimization?: ModelOptimization;
  tags?: string[];
  trigger?: string[];
  min_bridge_version?: number;
}

export interface ModelConfigurations {
  [modelName: string]: ModelConfiguration;
}
