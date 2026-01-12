import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, take } from 'rxjs';

/**
 * Service to manage token refresh state and prevent race conditions
 * when multiple 401 errors occur simultaneously.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private isRefreshing = new BehaviorSubject<boolean>(false);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  get isRefreshing$() {
    return this.isRefreshing.asObservable();
  }

  get refreshToken$() {
    return this.refreshTokenSubject.asObservable();
  }

  get isCurrentlyRefreshing(): boolean {
    return this.isRefreshing.getValue();
  }

  startRefresh(): void {
    this.isRefreshing.next(true);
    this.refreshTokenSubject.next(null);
  }

  completeRefresh(token: string): void {
    this.isRefreshing.next(false);
    this.refreshTokenSubject.next(token);
  }

  failRefresh(): void {
    this.isRefreshing.next(false);
    this.refreshTokenSubject.next(null);
  }

  /**
   * Returns an observable that emits once when the token refresh is complete.
   * Used by queued requests to wait for the new token.
   */
  waitForRefresh() {
    return this.refreshToken$.pipe(
      filter(token => token !== null),
      take(1)
    );
  }
}
