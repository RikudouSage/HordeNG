export enum Channel {
  FrontendNews = 'frontend-news',
  Marketing = 'marketing',
  HordeNews = 'horde-news',
  Parties = 'parties',
}

export interface Notification {
  id: string;
  title: string;
  validSince: string;
  validUntil: string;
  description?: string;
  link?: string;
  channels?: Channel[];
}
