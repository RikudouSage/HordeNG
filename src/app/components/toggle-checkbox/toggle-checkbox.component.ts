import {Component, effect, input, signal, WritableSignal} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {OnChange, OnTouched} from "../../types/value-accessor";

@Component({
  selector: 'app-toggle-checkbox',
  standalone: true,
  imports: [],
  templateUrl: './toggle-checkbox.component.html',
  styleUrl: './toggle-checkbox.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ToggleCheckboxComponent,
    },
  ],
})
export class ToggleCheckboxComponent implements ControlValueAccessor {
  private onChange: WritableSignal<OnChange<boolean> | null> = signal(null);
  private onTouched: WritableSignal<OnTouched | null> = signal(null);

  public value = signal(false);
  public disabled = signal(false);

  public description = input.required<string>();
  public random = signal(Math.random());

  constructor() {
    effect(() => {
      if (this.onChange() === null) {
        return;
      }
      (this.onChange()!)(this.value());
    });
  }

  public writeValue(value: boolean): void {
    this.value.set(value);
  }

  public registerOnChange(fn: OnChange<boolean>): void {
    this.onChange.set(fn);
  }

  public registerOnTouched(fn: OnTouched): void {
    this.onTouched.set(fn);
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
