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
      if (split.length === 1) {
        return `<span class="text-primary">${this.originalPrompt()}</span>`;
      }

      return split[1].trim().replace('{np}', `<span class="text-primary">${this.originalPrompt()}</span>`);
    }

    return this.stylePrompt()
      .split('###')[0]
      .trim()
      .replace('{p}', `<span class="text-primary">${this.originalPrompt()}</span>`)
      .split('{np}')[0]
      .trim()
  });

  public debug = computed(() => this.stylePrompt() === 'Intricate colorful neon rainbow {p} darkness, intricately stylized vector design, line work, flourishes, patterns###white, blank,{np}');
}
