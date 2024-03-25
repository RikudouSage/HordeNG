import {AfterViewInit, Directive, ElementRef, OnDestroy} from '@angular/core';
import autosize from "autosize";

@Directive({
  selector: 'textarea[auto-grow]',
  standalone: true
})
export class AutoGrowDirective implements AfterViewInit, OnDestroy {
  constructor(
    private readonly element: ElementRef<HTMLTextAreaElement>,
  ) {
  }

  public async ngOnDestroy(): Promise<void> {
    autosize.destroy(this.element.nativeElement);
  }

  public async ngAfterViewInit(): Promise<void> {
    autosize(this.element.nativeElement);
  }
}
