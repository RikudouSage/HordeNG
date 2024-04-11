import {Component, Inject, OnInit, PLATFORM_ID} from '@angular/core';
import {Router} from "@angular/router";
import {DatabaseService} from "../../services/database.service";
import {LoaderComponent} from "../../components/loader/loader.component";
import {isPlatformBrowser} from "@angular/common";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    LoaderComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly database: DatabaseService,
    @Inject(PLATFORM_ID)
    private readonly platform: string,
  ) {
  }

  public async ngOnInit(): Promise<void> {
    let homepage: string = 'about';
    if (isPlatformBrowser(this.platform)) {
      homepage = (await this.database.getSetting('homepage', 'about')).value;
    }

    await this.router.navigateByUrl(`/${homepage}`);
  }
}
