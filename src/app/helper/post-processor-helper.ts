import {PostProcessor} from "../types/horde/post-processor";

export function getFaceFixers(postProcessors: PostProcessor[]): PostProcessor[] {
  return postProcessors.filter(processor => [PostProcessor.CodeFormers, PostProcessor.GFPGAN].includes(processor));
}

export function getUpscalers(postProcessors: PostProcessor[]): PostProcessor[] {
  return postProcessors.filter(processor => [
    PostProcessor.RealESRGAN_x2plus,
    PostProcessor.RealESRGAN_x4plus,
    PostProcessor.RealESRGAN_x4plus_anime_6B,
    PostProcessor.NMKD_Siax,
    PostProcessor.FourX_AnimeSharp,
  ].includes(processor));
}

export function getGenericPostProcessors(postProcessors: PostProcessor[]): PostProcessor[] {
  const faceFixers = getFaceFixers(postProcessors);
  const upscalers = getUpscalers(postProcessors);

  return postProcessors.filter(processor => !faceFixers.includes(processor) && !upscalers.includes(processor));
}
