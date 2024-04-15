import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'languageName',
  standalone: true
})
export class LanguageNamePipe implements PipeTransform {

  transform(languageCode: string): string {
    const languageNames = new Intl.DisplayNames([languageCode], {type: "language"});
    return languageNames.of(languageCode) ?? languageCode;
  }

}
