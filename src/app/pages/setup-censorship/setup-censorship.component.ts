import {Component, OnInit} from '@angular/core';
import {Router} from "@angular/router";
import {CensorshipService} from "../../services/censorship.service";

@Component({
  selector: 'app-setup-censorship',
  standalone: true,
  imports: [],
  templateUrl: './setup-censorship.component.html',
  styleUrl: './setup-censorship.component.scss'
})
export class SetupCensorshipComponent implements OnInit {
  constructor(
    private readonly router: Router,
    censorshipService: CensorshipService,
  ) {
    censorshipService.enableCensorship();
  }

  public async ngOnInit(): Promise<void> {
    await this.router.navigateByUrl('/');
  }
}
