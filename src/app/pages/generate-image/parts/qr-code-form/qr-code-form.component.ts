import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator
} from "@angular/forms";
import {OnChange, OnTouched} from "../../../../types/value-accessor";
import {ToggleCheckboxComponent} from "../../../../components/toggle-checkbox/toggle-checkbox.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {TooltipComponent} from "../../../../components/tooltip/tooltip.component";
import {Subscriptions} from "../../../../helper/subscriptions";
import {QrCodePosition} from "../../../../types/qr-code-position.enum";

export interface QrCodeComponentValue {
  text: string | null;
  positionX: number | null;
  positionY: number | null;
  markersPrompt: string | null;
}

@Component({
  selector: 'app-qr-code-form',
  standalone: true,
  imports: [
    ToggleCheckboxComponent,
    TranslocoPipe,
    TooltipComponent,
    ReactiveFormsModule
  ],
  templateUrl: './qr-code-form.component.html',
  styleUrl: './qr-code-form.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: QrCodeFormComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: QrCodeFormComponent,
    },
  ],
})
export class QrCodeFormComponent implements ControlValueAccessor, OnInit, OnDestroy, Validator {
  private subscriptions = new Subscriptions();

  private onTouched = signal<OnTouched | null>(null);
  private onChange = signal<OnChange<QrCodeComponentValue> | null>(null);

  public form = new FormGroup({
    enabled: new FormControl<boolean>(false),
    text: new FormControl<string | null>(null),
    customPosition: new FormControl<boolean>(false),
    position: new FormControl<QrCodePosition | null>(null),
    positionX: new FormControl<number | null>(null),
    positionY: new FormControl<number | null>(null),
    customMarkersPrompt: new FormControl<boolean>(false),
    markersPrompt: new FormControl<string | null>(null),
  });

  public async ngOnInit(): Promise<void> {
    this.subscriptions.add(this.form.valueChanges.subscribe(changes => {
      if (this.onChange() === null || this.onTouched() === null) {
        return;
      }

      (this.onTouched()!)();
      (this.onChange()!)({
        text: changes.enabled ? (changes.text ?? null) : null,
        positionY: changes.position ? (changes.positionY ?? null) : null,
        positionX: changes.position ? (changes.positionX ?? null) : null,
        markersPrompt: changes.customMarkersPrompt ? (changes.markersPrompt ?? null) : null,
      });
    }));
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public writeValue(obj: string | QrCodeComponentValue | null): void {
    if (typeof obj === 'string') {
      obj = {
        text: obj,
        markersPrompt: null,
        positionX: null,
        positionY: null,
      };
    }
    this.form.patchValue({
      text: obj?.text ?? null,
      enabled: (obj?.text ?? '') !== '',
      markersPrompt: obj?.markersPrompt ?? null,
      customMarkersPrompt: (obj?.markersPrompt ?? '') !== '',
      position: QrCodePosition.Custom,
      positionX: obj?.positionX ?? null,
      positionY: obj?.positionY ?? null,
      customPosition: Boolean(obj?.positionX ?? null) && Boolean(obj?.positionY ?? null),
    });
  }

  public registerOnChange(fn: OnChange<QrCodeComponentValue>): void {
    this.onChange.set(fn);
  }

  public registerOnTouched(fn: OnTouched): void {
    this.onTouched.set(fn);
  }

  public setDisabledState(isDisabled: boolean) {
    isDisabled ? this.form.disable() : this.form.enable();
  }

  public validate(control: AbstractControl<any, any>): ValidationErrors | null {
    if (this.form.value.enabled && !this.form.value.text) {
      return {
        required: true,
      };
    }

    return null;
  }
}
