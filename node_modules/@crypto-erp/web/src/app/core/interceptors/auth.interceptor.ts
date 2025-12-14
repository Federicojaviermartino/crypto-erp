import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  const token = authService.getAccessToken();
  const companyId = authService.getCompanyId();

  let headers = req.headers;

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (companyId) {
    headers = headers.set('X-Company-Id', companyId);
  }

  const authReq = req.clone({ headers });
  return next(authReq);
};
