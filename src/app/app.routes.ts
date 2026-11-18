
import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth').then(m => m.Auth)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password')
        .then(m => m.ResetPassword)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard')
        .then(m => m.Dashboard)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile').then(m => m.Profile)
  },
  {
    path: 'create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/create/create').then(m => m.Create)
  },
  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/feed/feed').then(m => m.Feed)
  },
  {
    path: 'campaign-studio',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/campaign-studio/campaign-studio')
        .then(m => m.CampaignStudioComponent)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings').then(m => m.Settings)
  },
  {
    path: 'library',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/library/library')
        .then(m => m.LibraryComponent)
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/billing/billing')
        .then(m => m.BillingComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
