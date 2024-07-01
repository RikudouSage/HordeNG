import {Component} from '@angular/core';
import {RouterLink} from "@angular/router";
import {TranslocoPipe} from "@jsverse/transloco";
import {NgOptimizedImage} from "@angular/common";
import {TranslocoMarkupComponent} from "ngx-transloco-markup";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faGear, faImage, faRobot, faSliders} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-top-menu',
  standalone: true,
  imports: [
    RouterLink,
    TranslocoPipe,
    NgOptimizedImage,
    TranslocoMarkupComponent,
    FaIconComponent
  ],
  templateUrl: './top-menu.component.html',
  styleUrl: './top-menu.component.scss'
})
export class TopMenuComponent {
  public iconSliders = faSliders;
  public iconImages = faImage;
  public iconSettings = faGear;
  public iconHorde = faRobot;
}
