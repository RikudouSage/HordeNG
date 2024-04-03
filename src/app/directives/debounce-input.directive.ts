import {Directive, EventEmitter, HostListener, input, OnDestroy, OnInit, Output} from '@angular/core';
import {debounceTime, Observable, Subject, Subscription} from "rxjs";

@Directive({
  selector: '[debounceInput]',
  standalone: true
})
export class DebounceInputDirective implements OnInit, OnDestroy {
  private _debounceInput = new EventEmitter<Event>();
  public debounceDuration = input(300);

  private internalClickEvent = new Subject<Event>();
  private subscription: Subscription | null = null;

  // todo move to output signal once Jetbrains adds support for them
  @Output()
  public get debounceInput(): Observable<Event> {
    return this._debounceInput;
  }

  @HostListener('input', ['$event'])
  public onInput(event: Event): void {
    this.internalClickEvent.next(event);
  }

  public ngOnInit(): void {
    this.subscription = this.internalClickEvent
      .pipe(debounceTime(this.debounceDuration()))
      .subscribe(event => this._debounceInput.emit(event))
    ;
  }

  public ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
