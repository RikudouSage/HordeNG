import {Inject, Injectable} from '@angular/core';
import {DatabaseService} from "../database.service";
import {HttpClient} from "@angular/common/http";
import {Channel, HordeNotification} from "../../types/horde-notification";
import {environment} from "../../../environments/environment";
import {toPromise} from "../../helper/resolvable";
import {SettingKey} from "../../types/setting-keys";
import {CacheService} from "../cache.service";
import {NotificationEnricher} from "./notification.enricher";
import {NOTIFICATION_ENRICHER} from "../../app.config";
import {DeviceDetectorService} from "ngx-device-detector";
import {findBrowserLanguage} from "../../helper/language";
import {TranslocoService} from "@jsverse/transloco";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly httpClient: HttpClient,
    private readonly cache: CacheService,
    @Inject(NOTIFICATION_ENRICHER)
    private readonly enrichers: NotificationEnricher[],
    private readonly deviceDetector: DeviceDetectorService,
    private readonly transloco: TranslocoService,
  ) {}

  private async getNotifications(): Promise<HordeNotification[]> {
    const notifications = await toPromise(this.httpClient.get<HordeNotification[]>(environment.eventsUrl));
    const existing = (await this.database.getNotificationsByIds(notifications.map(notification => notification.id)))
      .map(notification => notification.id);

    await this.cleanup(notifications.map(notification => notification.id), existing);

    const availableLanguages = this.transloco.getAvailableLangs().map(language => typeof language === 'string' ? language : language.id)
    const language = (await this.database.getAppLanguage()) ?? findBrowserLanguage(availableLanguages) ?? 'en';

    return notifications.filter(notification => !existing.includes(notification.id))
      .map(notification => {
        const translation = notification.data?.["horde-ng"]?.translations?.[language] ?? null;
        notification.description = translation?.description ?? notification.description;
        notification.title = translation?.title ?? notification.title;

        return notification;
      });
  }

  public async getNotificationToDisplay(): Promise<HordeNotification | null> {
    const enabled = await this.database.getSetting('notificationsEnabled', true);
    if (!enabled.value) {
      return null;
    }

    const cacheItem = await this.cache.getItem<boolean>('notificationSeen');
    if (cacheItem.isHit) {
      return null;
    }

    let notifications: HordeNotification[];
    notifications = await this.getNotifications();
    notifications = await this.filterByChannel(notifications);
    notifications = await this.filterByConstraints(notifications);

    let notification = notifications.length ? notifications[0] : null;

    if (notification === null) {
      return null;
    }

    cacheItem.value = true;
    cacheItem.expiresAfter(2 * 60 * 60);
    await this.cache.save(cacheItem);

    for (const enricher of this.enrichers) {
      if (await enricher.supports(notification)) {
        notification = await enricher.enrich(notification);
      }
    }

    return notification;
  }

  public async markAsRead(notification: HordeNotification): Promise<void> {
    await this.database.storeNotifications([notification]);
  }

  private async cleanup(current: string[], existing: string[]) {
    const toRemove = existing.filter(item => !current.includes(item));
    await this.database.removeNotifications(toRemove);
  }

  private async filterByChannel(notifications: HordeNotification[]): Promise<HordeNotification[]> {
    const result: HordeNotification[] = [];

    for (const notification of notifications) {
      const channels = notification.channels;
      if (!channels) { // no channels, the notification can be displayed
        result.push(notification);
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

  private async filterByConstraints(notifications: HordeNotification[]): Promise<HordeNotification[]> {
    const result: HordeNotification[] = [];

    let seen: HordeNotification[] | null = null;
    for (const notification of notifications) {
      if (!notification.data?.["horde-ng"]) {
        result.push(notification);
        continue;
      }

      const data = notification.data["horde-ng"];
      if (data.requiredVersion) {
        const requiredVersions = Array.isArray(data.requiredVersion) ? data.requiredVersion : [data.requiredVersion];
        if (!requiredVersions.includes(environment.appVersion)) {
          continue;
        }
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

      if (data.desktopOnly && !this.deviceDetector.isDesktop()) {
        continue;
      }
      if (data.mobileOnly && !this.deviceDetector.isMobile() && !this.deviceDetector.isTablet()) {
        continue;
      }

      result.push(notification);
    }

    return result;
  }
}
