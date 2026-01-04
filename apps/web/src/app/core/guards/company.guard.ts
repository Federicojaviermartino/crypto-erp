import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that ensures user has a company before accessing protected routes.
 * Redirects to dashboard (which shows company setup) if no company exists.
 */
export const companyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const companyId = authService.getCompanyId();

  if (!companyId) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
