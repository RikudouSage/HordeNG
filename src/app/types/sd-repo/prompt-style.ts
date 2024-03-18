import {Sampler} from "../horde/sampler";

export interface PromptStyle {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler_name?: Sampler;
  loras?: {
    name: string;
    model?: number;
    clip?: number;
    inject_trigger?: string;
    is_version?: boolean;
  }[];
}

export interface PromptStyles {
  [styleName: string]: PromptStyle;
}

export interface CategoriesResponse {
  [category: string]: string[];
}

export interface EnrichedPromptStyle extends PromptStyle {
  name: string;
  category: string;
}
