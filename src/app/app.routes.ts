import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'horde',
    loadComponent: () => import('./pages/horde/horde.component').then(m => m.HordeComponent),
  },
  {
    path: 'generate',
    loadComponent: () => import('./pages/generate-image/generate-image.component').then(m => m.GenerateImageComponent),
  },
  {
    path: 'images',
    loadComponent: () => import('./pages/images/images.component').then(m => m.ImagesComponent),
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./pages/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
  },
];
