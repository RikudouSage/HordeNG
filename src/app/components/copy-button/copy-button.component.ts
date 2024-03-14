import {Component, input, Signal, signal} from '@angular/core';
import {faCopy} from "@fortawesome/free-solid-svg-icons";
import {IconDefinition} from "@fortawesome/free-regular-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {TranslatorService} from "../../services/translator.service";
import {MessageService} from "../../services/message.service";

@Component({
  selector: 'app-copy-button',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  templateUrl: './copy-button.component.html',
  styleUrl: './copy-button.component.scss'
})
export class CopyButtonComponent {
  public icon: Signal<IconDefinition> = signal(faCopy);
  public text = input.required<string>();

  constructor(
    private readonly translator: TranslatorService,
    private readonly messenger: MessageService,
  ) {
  }

  public async copyToClipboard(): Promise<void> {
    await navigator.clipboard.writeText(this.text());
    await this.messenger.success(this.translator.get('app.success.copied_to_clipboard'));
  }
}
