import {Injectable} from '@angular/core';
import {HordeRepoDataService} from "./horde-repo-data.service";
import {GenerationOptions} from "../types/db/generation-options";
import {toPromise} from "../helper/resolvable";

export enum OptionsValidationError {
  ModelNotFound,
  CfgScale,
  ClipSkip,
  Steps,
  Sampler,
  Karras,
}

export type OptionsValidationErrors = OptionsValidationError[];

@Injectable({
  providedIn: 'root'
})
export class GenerationOptionsValidatorService {
  constructor(
    private readonly repoData: HordeRepoDataService,
  ) {
  }

  public async getModelValidationStatus(options: GenerationOptions, modelName: string): Promise<OptionsValidationErrors> {
    const configData = await toPromise(this.repoData.getModelsConfig());
    const modelConfig = configData[modelName] ?? null;
    if (modelConfig === null) {
      return [OptionsValidationError.ModelNotFound];
    }

    if (!modelConfig.requirements) {
      return [];
    }

    const errors: OptionsValidationErrors = [];

    if (modelConfig.requirements.cfg_scale !== undefined && options.cfgScale !== modelConfig.requirements.cfg_scale) {
      errors.push(OptionsValidationError.CfgScale);
    }
    if (modelConfig.requirements.clip_skip !== undefined && options.clipSkip !== modelConfig.requirements.clip_skip) {
      errors.push(OptionsValidationError.ClipSkip);
    }
    if (modelConfig.requirements.max_steps !== undefined && options.steps > modelConfig.requirements.max_steps) {
      errors.push(OptionsValidationError.Steps);
    }
    if (modelConfig.requirements.min_steps !== undefined && options.steps < modelConfig.requirements.min_steps) {
      errors.push(OptionsValidationError.Steps);
    }
    if (modelConfig.requirements.samplers !== undefined && !modelConfig.requirements.samplers.includes(options.sampler)) {
      errors.push(OptionsValidationError.Sampler);
    }
    if (modelConfig.requirements.schedulers !== undefined && !options.karras) {
      errors.push(OptionsValidationError.Karras);
    }

    return errors;
  }
}
