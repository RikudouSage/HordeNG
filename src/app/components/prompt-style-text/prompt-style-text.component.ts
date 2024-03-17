import {Component, computed, input} from '@angular/core';

@Component({
  selector: 'app-prompt-style-text',
  standalone: true,
  imports: [],
  templateUrl: './prompt-style-text.component.html',
  styleUrl: './prompt-style-text.component.scss'
})
export class PromptStyleTextComponent {
  public negative = input(false);
  public stylePrompt = input.required<string>();
  public originalPrompt = input.required<string>();
  public promptHtml = computed(() => {
    if (this.negative()) {
      const split = this.stylePrompt().split('###');
      const target = split.length === 1 ? split[0].trim() : split[1].trim();

      const split2 = target
        .replace('{np}', `<span class="text-primary">${this.originalPrompt()}</span>`)
        .split('{p}');

      return split2.length === 1 ? split2[0].trim() : split2[1].trim();
    }

    return this.stylePrompt()
      .split('###')[0]
      .trim()
      .replace('{p}', `<span class="text-primary">${this.originalPrompt()}</span>`)
      .split('{np}')[0]
      .trim()
  });
}
