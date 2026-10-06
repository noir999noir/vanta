import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {

  const authService = inject(AuthService);
  const router = inject(Router);

  try {

    const session =
      await authService.getSession();

    if (session) {
      return true;
    }

    return router.createUrlTree([
      '/auth'
    ]);

  } catch (error) {

    console.error(
      '❌ VANTA auth guard error:',
      error
    );

    return router.createUrlTree([
      '/auth'
    ]);

  }

};