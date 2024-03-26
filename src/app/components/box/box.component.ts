import {Component, input, InputSignal, OnInit, output, signal, WritableSignal} from '@angular/core';
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {Resolvable} from "../../helper/resolvable";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ToObservablePipe} from "../../pipes/to-observable.pipe";
import {AsyncPipe} from "@angular/common";

export interface BoxButton {
  icon: IconDefinition;
  enabled: Resolvable<boolean>;
  action: (event: Event) => void;
  title: Resolvable<string>;
}

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [
    FaIconComponent,
    ToObservablePipe,
    AsyncPipe
  ],
  templateUrl: './box.component.html',
  styleUrl: './box.component.scss'
})
export class BoxComponent implements OnInit {
  public title: InputSignal<string> = input.required();
  public collapsible: InputSignal<boolean> = input(false);
  public collapsedByDefault: InputSignal<boolean> = input(true);

  public isCollapsed: WritableSignal<boolean> = signal(true);

  public buttons = input<BoxButton[]>([]);

  public collapsed = output<void>();
  public expanded = output<void>();

  public ngOnInit(): void {
    this.isCollapsed.set(this.collapsedByDefault());
  }

  public toggleCollapsed(): void {
    if (!this.collapsible()) {
      return;
    }

    this.isCollapsed.update(value => !value);
    if (this.isCollapsed()) {
      this.collapsed.emit();
    } else {
      this.expanded.emit();
    }
  }
}
