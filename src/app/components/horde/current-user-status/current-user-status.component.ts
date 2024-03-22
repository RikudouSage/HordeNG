import {Component, input, signal} from '@angular/core';
import {FormatNumberPipe} from "../../../pipes/format-number.pipe";
import {SmallBoxComponent} from "../../small-box/small-box.component";
import {TranslocoPipe} from "@ngneat/transloco";
import {faCoins, faCrosshairs, faImage} from "@fortawesome/free-solid-svg-icons";
import {UserDetails} from "../../../types/horde/user-details";

@Component({
  selector: 'app-current-user-status',
  standalone: true,
  imports: [
    FormatNumberPipe,
    SmallBoxComponent,
    TranslocoPipe
  ],
  templateUrl: './current-user-status.component.html',
  styleUrl: './current-user-status.component.scss'
})
export class CurrentUserStatusComponent {
  public currentUser = input.required<UserDetails>();

  public kudosIcon = signal(faCoins);
  public requestedIcon = signal(faImage);
  public generatedIcon = signal(faCrosshairs);
}
