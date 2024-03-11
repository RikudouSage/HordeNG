import {ValidationErrors, ValidatorFn} from "@angular/forms";

export class AppValidators {
  public static divisibleBy(number: number): ValidatorFn {
    return control => {
      if (typeof control.value !== 'number') {
        return null;
      }

      if (control.value % number === 0) {
        return null;
      }

      return {
        divisibleBy: {[number]: false},
      };
    };
  }
}
