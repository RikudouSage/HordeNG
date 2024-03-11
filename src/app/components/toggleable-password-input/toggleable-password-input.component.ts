import {Component, computed, effect, input, signal, WritableSignal} from '@angular/core';
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule} from "@angular/forms";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faEye, faEyeSlash} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-toggleable-password-input',
  standalone: true,
  imports: [
    FaIconComponent,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './toggleable-password-input.component.html',
  styleUrl: './toggleable-password-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ToggleablePasswordInputComponent,
    },
  ]
})
export class ToggleablePasswordInputComponent implements ControlValueAccessor {
  private onChange: WritableSignal<((value: string) => void) | null> = signal(null);
  private onTouched: WritableSignal<(() => void) | null> = signal(null);

  private iconEyeOpen = signal(faEye);
  private iconEyeClosed = signal(faEyeSlash);

  public inputId = input<string>();

  public disabled = signal(false);
  public value = signal('');
  public passwordVisible = signal<boolean>(false);
  public passwordFieldIcon = computed(() => {
    if (this.passwordVisible()) {
      return this.iconEyeClosed();
    }

    return this.iconEyeOpen();
  });

  constructor() {
    effect(() => {
      if (this.onChange() === null) {
        return;
      }
      (this.onChange()!)(this.value());
    });
  }

  public writeValue(value: string): void {
    this.value.set(value);
  }

  public registerOnChange(fn: any): void {
    this.onChange.set(fn);
  }

  public registerOnTouched(fn: any): void {
    this.onTouched.set(fn);
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  public async togglePasswordVisibility(): Promise<void> {
    this.passwordVisible.update(visible => !visible);
  }
}
