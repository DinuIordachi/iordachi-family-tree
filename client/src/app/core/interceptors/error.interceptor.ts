import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 422) {
        // Validation errors — pass through for form handling
        return throwError(() => err);
      }

      if (err.status === 500) {
        notificationService.error('A server error occurred. Please try again later.');
      } else if (err.status === 403) {
        notificationService.error('You do not have permission to perform this action.');
      } else if (err.status === 404) {
        notificationService.error('The requested resource was not found.');
      } else if (err.status === 0) {
        notificationService.error('Unable to connect to the server. Please check your connection.');
      }

      return throwError(() => err);
    })
  );
};
