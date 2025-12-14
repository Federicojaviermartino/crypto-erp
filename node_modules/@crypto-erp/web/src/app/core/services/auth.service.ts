import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, BehaviorSubject } from 'rxjs';
import { environment } from '@env/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const COMPANY_ID_KEY = 'company_id';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private currentUserSignal = signal<User | null>(null);
  private currentCompanyIdSignal = signal<string | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly currentCompanyId = this.currentCompanyIdSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadStoredCompanyId();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => this.handleAuthResponse(response)),
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((response) => this.handleAuthResponse(response)),
    );
  }

  refreshToken(): Observable<AuthTokens | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    return this.http.post<AuthTokens>(`${this.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap((tokens) => {
        this.setTokens(tokens);
      }),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  loadCurrentUser(): Observable<User | null> {
    const token = this.getAccessToken();
    if (!token) {
      return of(null);
    }

    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => this.currentUserSignal.set(user)),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  setCompanyId(companyId: string): void {
    localStorage.setItem(COMPANY_ID_KEY, companyId);
    this.currentCompanyIdSignal.set(companyId);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getCompanyId(): string | null {
    return localStorage.getItem(COMPANY_ID_KEY);
  }

  private handleAuthResponse(response: AuthResponse): void {
    this.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    this.currentUserSignal.set(response.user);
  }

  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private loadStoredCompanyId(): void {
    const companyId = localStorage.getItem(COMPANY_ID_KEY);
    if (companyId) {
      this.currentCompanyIdSignal.set(companyId);
    }
  }
}
