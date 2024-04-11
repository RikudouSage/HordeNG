import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {DatabaseService} from "../../services/database.service";
import {LoaderComponent} from "../../components/loader/loader.component";

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
  ) {
  }

  public async ngOnInit(): Promise<void> {
    const homepage = await this.database.getSetting('homepage', 'about');
    await this.router.navigateByUrl(`/${homepage.value}`);
  }
}
