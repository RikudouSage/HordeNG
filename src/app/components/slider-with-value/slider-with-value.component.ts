import {Component, effect, input, signal, WritableSignal} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule} from "@angular/forms";
import {OnChange, OnTouched} from "../../types/value-accessor";

@Component({
  selector: 'app-slider-with-value',
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './slider-with-value.component.html',
  styleUrl: './slider-with-value.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: SliderWithValueComponent,
    },
  ]
})
export class SliderWithValueComponent implements ControlValueAccessor {
  protected readonly Number = Number;

  private onChange: WritableSignal<OnChange<number> | null> = signal(null);
  private onTouched: WritableSignal<OnTouched | null> = signal(null);

  public inputId = input<string>();
  public required = input(false);
  public min = input<number | null>(null);
  public max = input<number | null>(null);
  public step = input<number | null>(null);

  public disabled = signal(false);

  public value = signal(0);

  constructor() {
    effect(() => {
      if (this.onChange() === null) {
        return;
      }
      (this.onChange()!)(this.value());
      if (this.onTouched() !== null) {
        (this.onTouched()!)();
      }
    });
  }

  public registerOnChange(fn: OnChange<number>): void {
    this.onChange.set(fn);
  }

  public registerOnTouched(fn: OnTouched): void {
    this.onTouched.set(fn);
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  public writeValue(obj: number): void {
    this.value.set(obj);
  }
}
