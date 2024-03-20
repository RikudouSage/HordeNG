import {Injectable} from '@angular/core';
import {GenerationOptions} from "../types/db/generation-options";
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
    if (!options.prompt) {
      return 0;
    }
    let response = await toPromise(this.api.generateImage(options, true));
    if (!response.success) {
      response = await toPromise(this.api.generateImage({...options, allowDowngrade: true}, true));
    }
    if (!response.success) {
      return null;
    }

    return response.successResponse!.kudos;
  }
}
