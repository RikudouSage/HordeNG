import {HordeNotification} from "../../types/horde-notification";

export interface NotificationEnricher {
  supports(notification: HordeNotification): Promise<boolean>;
  enrich(notification: HordeNotification): Promise<HordeNotification>;
}
