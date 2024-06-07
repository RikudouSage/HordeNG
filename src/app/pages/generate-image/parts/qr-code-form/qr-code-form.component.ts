import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule} from "@angular/forms";
import {OnChange, OnTouched} from "../../../../types/value-accessor";
import {ToggleCheckboxComponent} from "../../../../components/toggle-checkbox/toggle-checkbox.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {TooltipComponent} from "../../../../components/tooltip/tooltip.component";
import {Subscriptions} from "../../../../helper/subscriptions";

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
  ],
})
export class QrCodeFormComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private subscriptions = new Subscriptions();

  private onTouched = signal<OnTouched | null>(null);
  private onChange = signal<OnChange<string | null> | null>(null);

  public form = new FormGroup({
    enabled: new FormControl<boolean>(false),
    text: new FormControl<string | null>(null),
  });

  public async ngOnInit(): Promise<void> {
    this.subscriptions.add(this.form.valueChanges.subscribe(changes => {
      if (this.onChange() === null || this.onTouched() === null) {
        return;
      }

      (this.onTouched()!)();
      (this.onChange()!)(changes.enabled ? (changes.text ?? null) : null);
    }));
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public writeValue(obj: string | null): void {
    this.form.patchValue({
      text: obj,
      enabled: (obj ?? '') !== '',
    });
  }

  public registerOnChange(fn: OnChange<string | null>): void {
    this.onChange.set(fn);
  }

  public registerOnTouched(fn: OnTouched): void {
    this.onTouched.set(fn);
  }

  public setDisabledState(isDisabled: boolean) {
    isDisabled ? this.form.disable() : this.form.enable();
  }
}
