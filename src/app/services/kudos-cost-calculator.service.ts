import { Injectable } from '@angular/core';
import {GenerationOptions} from "../types/db/generation-options";
import {Sampler} from "../types/horde/sampler";

@Injectable({
  providedIn: 'root'
})
export class KudosCostCalculator {
  public calculate(options: GenerationOptions): number {
    const result = Math.pow((options.width * options.height) - (64 * 64), 1.75) / Math.pow((1024 * 1024) - (64 * 64), 1.75);
    const steps = this.getAccurateSteps(options);
    let kudos = Math.round(((0.1232 * steps) + result * (0.1232 * steps * 8.75)) * 100) / 100;

    // for (let i = 0; i < postProcessors.length; i++) {
    //   kudos = Math.round(kudos * 1.2 * 100) / 100;
    // }

    // if (usesControlNet) {
    //   kudos = Math.round(kudos * 3 * 100) / 100;
    // }

    const weightsCount = this.countParentheses(options.negativePrompt ? `${options.prompt} ### ${options.negativePrompt}` : options.prompt);
    kudos += weightsCount;

    // if (hasSourceImage) {
    //   kudos = kudos * 1.5;
    // }

    // if (postProcessors.includes('RealESRGAN_x4plus')) {
    //   kudos = kudos * 1.3;
    // }
    // if (postProcessors.includes('RealESRGAN_x4plus_anime_6B')) {
    //   kudos = kudos * 1.3;
    // }
    // if (postProcessors.includes('CodeFormers')) {
    //   kudos = kudos * 1.3;
    // }

    let hordeTax = 3;
    // if (shareWithLaionEnabled) {
    //   hordeTax = 1;
    // }
    if (kudos < 10) {
      hordeTax -= 1;
    }
    kudos += hordeTax;

    return Math.round(kudos*100)/100;
  }

  private countParentheses(prompt: string): number {
    let openP = false;
    let count = 0;
    for (let i = 0; i < prompt.length; i++) {
      const c = prompt[i];
      if (c === "(") {
        openP = true;
      } else if (c === ")" && openP) {
        openP = false;
        count++;
      }
    }

    return count;
  }

  private getAccurateSteps(options: GenerationOptions): number {
    let steps = options.steps;
    if ([Sampler.k_dpm_adaptive].includes(options.sampler)) {
      return 50;
    }
    if ([Sampler.k_heun, Sampler.k_dpm_2, Sampler.k_dpm_2_a, Sampler.k_dpmpp_2s_a].includes(options.sampler)) {
      steps *= 2;
    }
    // if (hasSourceImage && isImg2Img && doesDenoiseStrengthAffectSteps) {
    //   steps *= denoisingStrength;
    // }
    return steps;
  }
}
