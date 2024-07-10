import {Injectable} from '@angular/core';
import {DatabaseService} from "./database.service";
import {HttpClient} from "@angular/common/http";
import {Notification} from "../types/notification";
import {environment} from "../../environments/environment";
import {toPromise} from "../helper/resolvable";

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
    if (notifications.length) {
      return notifications[0];
    }

    return null;
  }

  public async markAsRead(notification: Notification): Promise<void> {
    await this.database.storeNotifications([notification]);
  }

  private async cleanup(current: string[], existing: string[]) {
    const toRemove = existing.filter(item => !current.includes(item));
    await this.database.removeNotifications(toRemove);
  }
}
