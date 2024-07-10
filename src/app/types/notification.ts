export interface Notification {
  id: string;
  title: string;
  validSince: string;
  validUntil: string;
  description?: string;
  link?: string;
}
