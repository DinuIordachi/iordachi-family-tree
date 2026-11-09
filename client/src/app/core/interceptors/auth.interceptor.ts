import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Endpoints for signing in. They must go out without a token: the API refuses
 * them (403) from a caller who is still authenticated, so a token left over
 * from an earlier session would block logging in again.
 */
const GUEST_ENDPOINTS = ['/login', '/register', '/forgot-password', '/reset-password'];
const isGuestEndpoint = (url: string): boolean => {
  const path = url.split('?')[0];
  return GUEST_ENDPOINTS.some((e) => path.endsWith(e));
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && !isGuestEndpoint(req.url)) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && !req.url.includes('/login')) {
        authService.clearAuth();
      }
      return throwError(() => err);
    })
  );
};
