import {Component, input, InputSignal, OnInit, signal, WritableSignal} from '@angular/core';

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [],
  templateUrl: './box.component.html',
  styleUrl: './box.component.scss'
})
export class BoxComponent implements OnInit {
  public title: InputSignal<string> = input.required();
  public collapsible: InputSignal<boolean> = input(false);
  public collapsedByDefault: InputSignal<boolean> = input(true);

  public collapsed: WritableSignal<boolean> = signal(true);

  public ngOnInit(): void {
    this.collapsed.set(this.collapsedByDefault());
  }

  public toggleCollapsed(): void {
    if (!this.collapsible()) {
      return;
    }

    this.collapsed.update(value => !value);
  }
}
