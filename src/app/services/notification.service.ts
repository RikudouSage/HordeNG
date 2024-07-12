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

    let notifications: Notification[];
    notifications = await this.getNotifications();
    notifications = await this.filterByChannel(notifications);
    notifications = await this.filterByConstraints(notifications);

    return notifications.length ? notifications[0] : null;
  }

  public async markAsRead(notification: Notification): Promise<void> {
    await this.database.storeNotifications([notification]);
  }

  private async cleanup(current: string[], existing: string[]) {
    const toRemove = existing.filter(item => !current.includes(item));
    await this.database.removeNotifications(toRemove);
  }

  private async filterByChannel(notifications: Notification[]): Promise<Notification[]> {
    const result: Notification[] = [];

    for (const notification of notifications) {
      const channels = notification.channels;
      if (!channels) { // no channels, the notification can be displayed
        continue;
      }

      let canSend = false;
      loop: for (const channel of channels) {
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
          case Channel.Other:
            settingName = SettingKey.NotificationsOtherEnabled;
            break;
          default:
            canSend = true;
            break loop;
        }

        const setting = await this.database.getSetting(settingName, true);
        if (!setting.value) {
          continue;
        }

        canSend = true;
        break;
      }

      if (canSend) {
        result.push(notification);
      }
    }

    return result;
  }

  private async filterByConstraints(notifications: Notification[]): Promise<Notification[]> {
    const result: Notification[] = [];

    let seen: Notification[] | null = null;
    for (const notification of notifications) {
      if (!notification.data?.["horde-ng"]) {
        result.push(notification);
        continue;
      }

      const data = notification.data["horde-ng"];
      if (data.requiredVersion && environment.appVersion !== data.requiredVersion) {
        continue;
      }

      if (data.onlyIfNotSeen) {
        seen ??= await this.database.getNotifications();
        if (seen.map(item => item.id).includes(data.onlyIfNotSeen)) {
          continue;
        }
      }
      if (data.onlyIfSeen) {
        seen ??= await this.database.getNotifications();
        if (!seen.map(item => item.id).includes(data.onlyIfSeen)) {
          continue;
        }
      }

      result.push(notification);
    }

    return result;
  }
}
