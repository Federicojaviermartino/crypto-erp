import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();

  if (!token) {
    router.navigate(['/auth/login']);
    return false;
  }

  // If we have a token but no user loaded, load the user
  if (!authService.currentUser()) {
    return authService.loadCurrentUser().pipe(
      take(1),
      map((user) => {
        if (user) {
          return true;
        }
        router.navigate(['/auth/login']);
        return false;
      }),
    );
  }

  return true;
};
