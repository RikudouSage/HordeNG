import {Unsubscribable} from "../types/unsubscribable";

export class Subscriptions {
  private subscriptions: Unsubscribable[];

  constructor(...subscriptions: Unsubscribable[]) {
    this.subscriptions = subscriptions;
  }

  public add(subscription: Unsubscribable): void {
    this.subscriptions.push(subscription);
  }

  public unsubscribe(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
  }
}
