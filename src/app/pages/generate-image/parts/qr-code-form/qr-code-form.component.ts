import {Component, input, OnDestroy, OnInit, signal} from '@angular/core';
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
import {TomSelectDirective} from "../../../../directives/tom-select.directive";

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
    ReactiveFormsModule,
    TomSelectDirective
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
  private readonly offset = 32;
  protected readonly QrCodePosition = QrCodePosition;

  private subscriptions = new Subscriptions();

  public imageWidth = input.required<number>();
  public imageHeight = input.required<number>();

  private onTouched = signal<OnTouched | null>(null);
  private onChange = signal<OnChange<QrCodeComponentValue> | null>(null);

  public form = new FormGroup({
    enabled: new FormControl<boolean>(false),
    text: new FormControl<string | null>(null),
    customPosition: new FormControl<boolean>(false),
    position: new FormControl<QrCodePosition>(QrCodePosition.Center),
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

    this.subscriptions.add(this.form.valueChanges.subscribe(changes => {
      if (!changes.customPosition) {
        if (changes.position !== QrCodePosition.Center || changes.positionX !== null || changes.positionY !== null) {
          this.form.patchValue({
            position: QrCodePosition.Center,
            positionX: null,
            positionY: null,
          });
        }
        return;
      }

      let x: number | null = 0;
      let y: number | null = 0;

      switch (changes.position) {
        case QrCodePosition.TopRight:
          x = this.imageWidth() - this.offset;
          y = this.offset;
          break;
        case QrCodePosition.TopLeft:
          x = this.offset;
          y = this.offset;
          break;
        case QrCodePosition.Center:
          x = null;
          y = null;
          break;
        case QrCodePosition.BottomLeft:
          x = this.offset;
          y = this.imageHeight() - this.offset;
          break;
        case QrCodePosition.BottomRight:
          x = this.imageWidth() - this.offset;
          y = this.imageHeight() - this.offset;
          break;
        case QrCodePosition.Custom:
          x = changes.positionX ?? 0;
          y = changes.positionY ?? 0;
          break;
        default:
          throw new Error(`Uncovered enum case: ${changes.position}`);
      }

      if (x === changes.positionX && y === changes.positionY) {
        return;
      }

      this.form.patchValue({
        positionX: x,
        positionY: y,
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
      position: this.findPosition(obj?.positionX ?? null, obj?.positionY ?? null),
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

    if (this.form.value.customPosition) {
      if ((this.form.value.positionX ?? 0) > this.imageWidth()) {
        return {
          xPositionInvalid: true,
        };
      }
      if ((this.form.value.positionY ?? 0) > this.imageHeight()) {
        return {
          yPositionInvalid: true,
        };
      }
    }

    if (this.form.value.customMarkersPrompt && !this.form.value.markersPrompt) {
      return {
        markersPrompt: true,
      };
    }

    return null;
  }

  private findPosition(x: number | null, y: number | null): QrCodePosition {
    if (x === null && y === null) {
      return QrCodePosition.Center;
    }

    switch (x) {
      case this.offset:
        switch (y) {
          case this.offset:
            return QrCodePosition.TopLeft;
          case this.imageHeight() - this.offset:
            return QrCodePosition.BottomLeft;
          default:
            return QrCodePosition.Custom;
        }
      case this.imageWidth() - this.offset:
        switch (y) {
          case this.offset:
            return QrCodePosition.TopRight;
          case this.imageHeight() - this.offset:
            return QrCodePosition.BottomRight;
          default:
            return QrCodePosition.Custom;
        }
      default:
        return QrCodePosition.Custom;
    }
  }
}
