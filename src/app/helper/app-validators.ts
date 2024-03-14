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

  public static uuid(control: AbstractControl): ValidationErrors | null {
    if (typeof control.value !== 'string') {
      return {uuid: 'not-a-string'};
    }

    return /[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/.test(control.value)
      ? null
      : {uuid: false};
  }

  public static notEqualTo(value: any): ValidatorFn {
    return control => control.value === value ? {notEqualTo: false} : null;
  }

  public static equalTo(value: any): ValidatorFn {
    return control => control.value === value ? null : {equalTo: false};
  }

  public static or (...validators: ValidatorFn[]): ValidatorFn {
    return control => {
      const errors: ValidationErrors = {};
      for (const validator of validators) {
        const result = validator(control);
        if (result === null) {
          return null;
        }
        for (const key of Object.keys(result)) {
          errors[key] = result[key];
        }
      }

      return errors;
    };
  }
}
