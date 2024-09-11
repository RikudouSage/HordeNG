import {BaselineModel} from "../types/sd-repo/baseline-model";
import {CivitAiBaseModel} from "../types/civit-ai/civit-ai-base-model";

export function convertToCivitAiBase(hordeBase: BaselineModel): CivitAiBaseModel[] {
  switch (hordeBase) {
    case BaselineModel.StableDiffusionXl:
      return [
        CivitAiBaseModel.SDXL_0_9,
        CivitAiBaseModel.SDXL_1_0,
        CivitAiBaseModel.SDXL_1_0_LCM,
        CivitAiBaseModel.SDXL_Distilled,
        CivitAiBaseModel.SDXL_Turbo,
        CivitAiBaseModel.SDXL_Lightning,
      ];
    case BaselineModel.StableDiffusion2:
      return [
        CivitAiBaseModel.StableDiffusion2_0,
        CivitAiBaseModel.StableDiffusion2_0_768,
        CivitAiBaseModel.StableDiffusion2_1,
        CivitAiBaseModel.StableDiffusion2_1_768,
        CivitAiBaseModel.StableDiffusion2_1_Unclip,
      ];
    case BaselineModel.StableDiffusion1:
      return [
        CivitAiBaseModel.StableDiffusion1_4,
        CivitAiBaseModel.StableDiffusion1_5,
        CivitAiBaseModel.StableDiffusion1_5_LCM,
      ];
    case BaselineModel.StableCascade:
      return [CivitAiBaseModel.StableCascade];
    case BaselineModel.Flux1:
      return [CivitAiBaseModel.Flux1S];
  }
}

export function doModelBasesMatch (hordeBase: BaselineModel, civitAiBase: CivitAiBaseModel): boolean {
  return convertToCivitAiBase(hordeBase).includes(civitAiBase);
}
