if (typeof window === 'undefined') {
  (<any>global).window = <any>{};
}

export const environment = {
  appName: 'HordeNG',
  appVersion: (<any>window)?.['APP_VERSION'] ?? '0.0.1',
  maintainer: 'Rikudou',
  apiUrl: 'https://aihorde.net/api',
  apiVersion: 'v2',
  prod: true,
};
