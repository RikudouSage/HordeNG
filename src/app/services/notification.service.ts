import {Injectable} from '@angular/core';
import {DatabaseService} from "./database.service";
import {HttpClient} from "@angular/common/http";
import {Channel, Notification} from "../types/notification";
import {environment} from "../../environments/environment";
import {toPromise} from "../helper/resolvable";
import {SettingKey} from "../types/setting-keys";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly httpClient: HttpClient,
  ) {}

  private async getNotifications(): Promise<Notification[]> {
    const notifications = await toPromise(this.httpClient.get<Notification[]>(environment.eventsUrl));
    const existing = (await this.database.getNotificationsByIds(notifications.map(notification => notification.id)))
      .map(notification => notification.id);

    await this.cleanup(notifications.map(notification => notification.id), existing);

    return notifications.filter(notification => !existing.includes(notification.id));
  }

  public async getNotificationToDisplay(): Promise<Notification | null> {
    const enabled = await this.database.getSetting('notificationsEnabled', true);
    if (!enabled.value) {
      return null;
    }

    const notifications = await this.getNotifications();
    let notification: Notification | null = null;

    while (notifications.length > 0 && notification === null) {
      notification = notifications.shift() ?? null;
      if (notification === null) {
        continue;
      }
      const channels = notification.channels;
      if (!channels) { // no channels, the notification can be displayed
        break;
      }

      let canSend = false;
      for (const channel of channels) {
        let settingName: SettingKey;
        switch (channel) {
          case Channel.FrontendNews:
            settingName = SettingKey.NotificationsHordeNgNewsEnabled;
            break;
          case Channel.HordeNews:
            settingName = SettingKey.NotificationsHordeNewsEnabled;
            break;
          case Channel.Marketing:
            settingName = SettingKey.NotificationsMarketingEnabled;
            break;
          case Channel.Parties:
            settingName = SettingKey.NotificationsPartiesEnabled;
            break;
        }

        const setting = await this.database.getSetting(settingName, true);
        if (!setting.value) {
          continue;
        }
        canSend = true;
        break;
      }

      if (!canSend) {
        notification = null;
      }
    }

    return notification;
  }

  public async markAsRead(notification: Notification): Promise<void> {
    await this.database.storeNotifications([notification]);
  }

  private async cleanup(current: string[], existing: string[]) {
    const toRemove = existing.filter(item => !current.includes(item));
    await this.database.removeNotifications(toRemove);
  }
}
