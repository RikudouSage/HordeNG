import {Injectable} from '@angular/core';
import {ToastrService} from "ngx-toastr";
import {Resolvable, toPromise} from "../helper/resolvable";
import {TranslatorService} from "./translator.service";

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  constructor(
    private readonly toastr: ToastrService,
    private readonly translator: TranslatorService,
  ) {}

  public async success(message: Resolvable<string>, title: Resolvable<string> = this.translator.get('app.success')): Promise<void> {
    this.toastr.success(
      await toPromise(message),
      await toPromise(title),
    );
  }

  public async error(message: Resolvable<string>, title: Resolvable<string> = this.translator.get('app.error')): Promise<void> {
    this.toastr.error(
      await toPromise(message),
      await toPromise(title),
    );
  }
}
