import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Admin-only pages: everyone else is sent back to the dashboard. Right after
 * a login the profile (and so the roles) may still be loading, so wait for it.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initialize().pipe(
    switchMap((authenticated) =>
      authenticated && !authService.currentUser()
        ? authService.me().pipe(
            map(() => true),
            catchError(() => of(false)),
          )
        : of(authenticated),
    ),
    map(() => (authService.isAdmin() ? true : router.createUrlTree(['/dashboard']))),
  );
};
