import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'company',
    loadComponent: () => import('./company/company-settings.component').then(m => m.CompanySettingsComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile-settings.component').then(m => m.ProfileSettingsComponent),
  },
];
