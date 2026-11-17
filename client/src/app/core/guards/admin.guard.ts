import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Admin-only pages: everyone else is sent back to the dashboard. */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initialize().pipe(
    map(() => (authService.isAdmin() ? true : router.createUrlTree(['/dashboard']))),
  );
};
