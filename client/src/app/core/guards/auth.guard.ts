import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RETURN_URL_PARAM, safeReturnUrl } from './return-url';

/** Lets signed-in users through; sends guests to /login, remembering the page they asked for. */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initialize().pipe(
    map(authenticated => {
      if (authenticated) {
        return true;
      }
      const returnUrl = safeReturnUrl(state.url);
      return router.createUrlTree(['/login'], returnUrl ? { queryParams: { [RETURN_URL_PARAM]: returnUrl } } : {});
    })
  );
};
