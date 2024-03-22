import {Component, input, InputSignal, OnInit, output, signal, WritableSignal} from '@angular/core';

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

  public isCollapsed: WritableSignal<boolean> = signal(true);

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
