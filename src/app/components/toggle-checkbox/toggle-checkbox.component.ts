import {Component, effect, input, OnInit, output, signal, WritableSignal} from '@angular/core';
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
export class ToggleCheckboxComponent implements ControlValueAccessor, OnInit {
  private onChange: WritableSignal<OnChange<boolean> | null> = signal(null);
  private onTouched: WritableSignal<OnTouched | null> = signal(null);

  private formMode = signal(true);

  public initialValue = input<boolean | null>(null);

  public value = signal(false);
  public disabled = signal(false);

  public description = input.required<string>();
  public random = signal(Math.random());

  public valueChanged = output<boolean>();

  constructor() {
    effect(() => {
      if (this.formMode()) {
        if (this.onChange() === null) {
          return;
        }
        (this.onChange()!)(this.value());
      } else {
        this.valueChanged.emit(this.value());
      }
    });
  }

  public async ngOnInit(): Promise<void> {
    if (this.initialValue() !== null) {
      this.formMode.set(false);
      this.value.set(this.initialValue()!);
    }
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
