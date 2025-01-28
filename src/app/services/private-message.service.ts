import {Injectable} from '@angular/core';
import {IncomingPrivateMessage} from "../types/incoming-private-message";
import {AiHorde} from "./ai-horde.service";
import {toPromise} from "../helper/resolvable";
import {DatabaseService} from "./database.service";
import {SettingKey} from "../types/setting-keys";

@Injectable({
  providedIn: 'root'
})
export class PrivateMessageService {
  constructor(
    private readonly horde: AiHorde,
    private readonly database: DatabaseService,
  ) {
  }

  public async getMessageToDisplay(): Promise<IncomingPrivateMessage | null> {
    const enabled = await this.database.getSetting(SettingKey.NotificationsWorkerMessages, true);
    if (!enabled.value) {
      return null;
    }

    const response = await toPromise(this.horde.getMessages());
    if (!response.success) {
      return null;
    }

    for (const message of response.successResponse!) {
      if (await this.database.privateMessageAlreadyRead(message.id)) {
        continue;
      }

      return message;
    }

    return null;
  }

  public async markAsRead(message: IncomingPrivateMessage): Promise<void> {
    await this.database.markPrivateMessageAsRead(message.id, new Date(message.expiry));
  }
}
