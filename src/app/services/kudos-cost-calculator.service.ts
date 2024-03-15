import {Injectable} from '@angular/core';
import {GenerationOptions} from "../types/db/generation-options";
import {Sampler} from "../types/horde/sampler";
import {PostProcessor} from "../types/horde/post-processor";
import {AiHorde} from "./ai-horde.service";
import {toPromise} from "../helper/resolvable";

@Injectable({
  providedIn: 'root'
})
export class KudosCostCalculator {
  constructor(
    private readonly api: AiHorde,
  ) {
  }

  public async calculate(options: GenerationOptions): Promise<number | null> {
    const response = await toPromise(this.api.generateImage(options, true));
    if (!response.success) {
      return null;
    }

    return response.successResponse!.kudos;
  }
}
