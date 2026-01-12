import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { TokenRefreshService } from '../services/token-refresh.service';

/**
 * HTTP Error Interceptor
 * Handles HTTP errors including automatic token refresh on 401 responses.
 * Uses TokenRefreshService to prevent race conditions when multiple 401 errors occur.
 */
export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - Token refresh
      if (error.status === 401 && !req.url.includes('/auth/')) {
        return tokenRefreshService.isRefreshing$.pipe(
          take(1),
          switchMap(isRefreshing => {
            if (!isRefreshing) {
              // Start the refresh process
              tokenRefreshService.startRefresh();

              return authService.refreshToken().pipe(
                switchMap((tokens) => {
                  if (tokens) {
                    tokenRefreshService.completeRefresh(tokens.accessToken);

                    // Retry the original request with new token
                    const newReq = req.clone({
                      headers: req.headers.set('Authorization', `Bearer ${tokens.accessToken}`),
                    });
                    return next(newReq);
                  }

                  tokenRefreshService.failRefresh();
                  authService.logout();
                  return throwError(() => error);
                }),
                catchError((refreshError) => {
                  tokenRefreshService.failRefresh();
                  authService.logout();
                  return throwError(() => refreshError);
                }),
              );
            } else {
              // Token is already being refreshed, wait for it
              return tokenRefreshService.waitForRefresh().pipe(
                switchMap(token => {
                  if (token) {
                    const newReq = req.clone({
                      headers: req.headers.set('Authorization', `Bearer ${token}`),
                    });
                    return next(newReq);
                  }
                  return throwError(() => error);
                })
              );
            }
          })
        );
      }

      // Handle 400 Bad Request - Show user-friendly error
      if (error.status === 400) {
        const message = error.error?.message || 'Invalid request. Please check the data entered.';
        notificationService.error(message);
      }

      // Handle 403 Forbidden
      if (error.status === 403) {
        notificationService.error('Access denied. You do not have permission to perform this action.');
      }

      // Handle 404 Not Found (only for API calls, not assets)
      if (error.status === 404 && req.url.includes('/api/')) {
        notificationService.error('The requested resource was not found.');
      }

      // Handle 500+ Server Errors
      if (error.status >= 500) {
        notificationService.error('Server error. Please try again later.');
      }

      return throwError(() => error);
    }),
  );
};
