import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

export const routes: Routes = [

  // =====================================================
  // ROOT
  // =====================================================

  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },


  // =====================================================
  // AUTH
  // =====================================================

  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/auth')
        .then(m => m.Auth)
  },


  // =====================================================
  // PROTECTED ROUTES
  // =====================================================

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard')
        .then(m => m.Dashboard)
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile')
        .then(m => m.Profile)
  },

  {
    path: 'create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/create/create')
        .then(m => m.Create)
  },

  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/feed/feed')
        .then(m => m.Feed)
  },

  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings')
        .then(m => m.Settings)
  },


  // =====================================================
  // FALLBACK
  // =====================================================

  {
    path: '**',
    redirectTo: 'dashboard'
  }

];