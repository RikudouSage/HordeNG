import {BaselineModel} from "../types/sd-repo/baseline-model";
import {CivitAiBaseModel} from "../types/civit-ai/civit-ai-base-model";

export function doModelBasesMatch (hordeBase: BaselineModel, civitAiBase: CivitAiBaseModel): boolean {
  switch (hordeBase) {
    case BaselineModel.StableCascade:
      return civitAiBase === CivitAiBaseModel.StableCascade;
    case BaselineModel.StableDiffusion1:
      return [
        CivitAiBaseModel.StableDiffusion1_4,
        CivitAiBaseModel.StableDiffusion1_5,
        CivitAiBaseModel.StableDiffusion1_5_LCM,
      ].includes(civitAiBase);
    case BaselineModel.StableDiffusion2:
      return [
        CivitAiBaseModel.StableDiffusion2_0,
        CivitAiBaseModel.StableDiffusion2_0_768,
        CivitAiBaseModel.StableDiffusion2_1,
        CivitAiBaseModel.StableDiffusion2_1_768,
        CivitAiBaseModel.StableDiffusion2_1_Unclip,
      ].includes(civitAiBase);
    case BaselineModel.StableDiffusionXl:
      return [
        CivitAiBaseModel.SDXL_0_9,
        CivitAiBaseModel.SDXL_1_0,
        CivitAiBaseModel.SDXL_1_0_LCM,
        CivitAiBaseModel.SDXL_Distilled,
        CivitAiBaseModel.SDXL_Turbo,
        CivitAiBaseModel.SDXL_Lightning,
      ].includes(civitAiBase);
  }
}
