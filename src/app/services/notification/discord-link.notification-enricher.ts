import {HordeNotification} from "../../types/horde-notification";
import {NotificationEnricher} from "./notification.enricher";
import {Injectable} from "@angular/core";
import {TranslatorService} from "../translator.service";
import {toPromise} from "../../helper/resolvable";

@Injectable({
  providedIn: 'root'
})
export class DiscordLinkNotificationEnricher implements NotificationEnricher {
  constructor(
    private readonly translator: TranslatorService,
  ) {
  }

  public async supports(notification: HordeNotification): Promise<boolean> {
    return (notification.link?.includes('discord.com') ?? false) && notification.description !== undefined;
  }

  public async enrich(notification: HordeNotification): Promise<HordeNotification> {
    const description = notification.description! + `\n\n` + (await toPromise(this.translator.get('app.notification.discord')));

    return {
      ...notification,
      description: description,
    };
  }
}
