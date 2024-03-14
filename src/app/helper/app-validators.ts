import {AbstractControl, FormGroup, ValidationErrors, ValidatorFn} from "@angular/forms";

export class AppValidators {
  public static divisibleBy(number: number): ValidatorFn {
    return control => {
      if (typeof control.value !== 'number') {
        return {divisibleBy: {[number]: 'nan'}};
      }

      if (control.value % number === 0) {
        return null;
      }

      return {divisibleBy: {[number]: false}};
    };
  }
  public static requiredIf(callback: (group: FormGroup) => boolean, ...controlNames: string[]): (group: AbstractControl) => (ValidationErrors | null) {
    return (group: AbstractControl): ValidationErrors | null => {
      if (!callback(<FormGroup>group)) {
        return null;
      }

      let hasErrors = false;
      const errors: {required: {[key: string]: true}} = {
        required: {},
      };
      for (const controlName of controlNames) {
        const control = (<FormGroup>group).controls[controlName];
        if (control === undefined) {
          errors.required[controlName] = true;
          hasErrors = true;
          continue;
        }

        if (!control.value && control.value !== 0) {
          errors.required[controlName] = true;
          hasErrors = true;
        }
      }

      return hasErrors ? errors : null;
    }
  }

  public static lazyMax(max: () => number): ValidatorFn {
    return control => {
      if (typeof control.value !== 'number') {
        return {max: 'nan'};
      }

      return control.value <= max() ? null : {max: false};
    };
  }

  public static regex(regex: RegExp): ValidatorFn {
    return control => {
      if (typeof control.value !== 'string') {
        return {regex: 'not-string'};
      }

      return regex.test(control.value) ? null : {regex: 'not-matching'};
    }
  }
}
