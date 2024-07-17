export enum Channel {
  FrontendNews = 'frontend-news',
  Marketing = 'marketing',
  HordeNews = 'horde-news',
  Parties = 'parties',
  Other = 'other',
}

export interface HordeNgData {
  requiredVersion: string | string[];
  onlyIfSeen: string;
  onlyIfNotSeen: string;
}

export interface HordeNotification {
  id: string;
  title: string;
  validSince: string;
  validUntil: string;
  description?: string;
  link?: string;
  channels?: Channel[];
  data?: {
    'horde-ng'?: Partial<HordeNgData>,
  },
}
