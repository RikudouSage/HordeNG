import {AfterViewInit, Directive, ElementRef, input} from '@angular/core';
import TomSelect from "tom-select";

@Directive({
  selector: 'select[tom-select]',
  standalone: true
})
export class TomSelectDirective implements AfterViewInit {
  public maxItems = input<number | null>(null);
  public create = input(false);
  public maxOptions = input<number|null>(50);

  constructor(
    private readonly element: ElementRef<HTMLSelectElement>,
  ) {
  }

  public async ngAfterViewInit(): Promise<void> {
    new TomSelect(this.element.nativeElement, {
      create: this.create(),
      maxItems: this.maxItems(),
      maxOptions: <any>this.maxOptions(),
    });
  }
}
