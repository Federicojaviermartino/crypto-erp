import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

type UserRole = 'client' | 'admin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="url(#gradient)"/>
              <path d="M12 6L18 12L12 18L6 12L12 6Z" fill="white" fill-opacity="0.9"/>
              <path d="M12 9L15 12L12 15L9 12L12 9Z" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="24" y2="24">
                  <stop stop-color="#6366f1"/>
                  <stop offset="1" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>Crypto ERP</h1>
          <p>Sign in to your account</p>
        </div>

        @if (error()) {
          <div class="alert alert-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {{ error() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="email">Email Address</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                id="email"
                class="form-input"
                formControlName="email"
                placeholder="you@example.com"
                [class.is-invalid]="isFieldInvalid('email')"
              />
            </div>
            @if (isFieldInvalid('email')) {
              <div class="form-error">Please enter a valid email address</div>
            }
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="form-label" for="password">Password</label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
            </div>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                id="password"
                class="form-input"
                formControlName="password"
                placeholder="••••••••"
                [class.is-invalid]="isFieldInvalid('password')"
              />
            </div>
            @if (isFieldInvalid('password')) {
              <div class="form-error">Password is required</div>
            }
          </div>

          <div class="remember-row">
            <label class="checkbox-wrapper">
              <input type="checkbox" formControlName="rememberMe" />
              <span class="checkmark"></span>
              <span class="checkbox-label">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="spinner"></span>
              Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>

        <div class="auth-divider">
          <span>or</span>
        </div>

        <div class="demo-credentials">
          <p class="demo-title">Demo Credentials</p>
          <div class="demo-options">
            <button type="button" class="demo-btn" (click)="fillDemoCredentials('client')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Client Demo
            </button>
            <button type="button" class="demo-btn" (click)="fillDemoCredentials('admin')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Admin Demo
            </button>
          </div>
        </div>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/auth/register">Sign up</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-lg);
      background-color: #f8fafc;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 32px;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-icon {
      margin-bottom: 16px;
    }

    .auth-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }

    .auth-header p {
      color: var(--gray-500);
      font-size: 0.95rem;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
    }

    .alert-danger {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-weight: 500;
      font-size: 0.9rem;
      color: var(--gray-700);
      margin-bottom: 8px;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .label-row .form-label {
      margin-bottom: 0;
    }

    .forgot-link {
      font-size: 0.85rem;
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }

    .forgot-link:hover {
      text-decoration: underline;
    }

    .input-wrapper {
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--gray-400);
    }

    .form-input {
      width: 100%;
      padding: 14px 14px 14px 46px;
      border: 2px solid var(--gray-200);
      border-radius: 12px;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      background: var(--white);
    }

    .form-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    .form-input.is-invalid {
      border-color: #ef4444;
    }

    .form-input::placeholder {
      color: var(--gray-400);
    }

    .form-error {
      margin-top: 6px;
      font-size: 0.85rem;
      color: #ef4444;
    }

    .remember-row {
      margin-bottom: 20px;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-wrapper input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      cursor: pointer;
    }

    .checkmark {
      width: 20px;
      height: 20px;
      border: 2px solid var(--gray-300);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      background: var(--white);
    }

    .checkbox-wrapper:hover .checkmark {
      border-color: #6366f1;
    }

    .checkbox-wrapper input[type="checkbox"]:checked ~ .checkmark {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-color: transparent;
    }

    .checkbox-wrapper input[type="checkbox"]:checked ~ .checkmark::after {
      content: '';
      width: 6px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      margin-bottom: 2px;
    }

    .checkbox-label {
      font-size: 0.9rem;
      color: var(--gray-600);
    }

    .btn {
      padding: 14px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-dark);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .w-100 {
      width: 100%;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .auth-divider {
      display: flex;
      align-items: center;
      margin: 24px 0;
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--gray-200);
    }

    .auth-divider span {
      padding: 0 16px;
      color: var(--gray-400);
      font-size: 0.85rem;
    }

    .demo-credentials {
      text-align: center;
    }

    .demo-title {
      font-size: 0.85rem;
      color: var(--gray-500);
      margin-bottom: 12px;
    }

    .demo-options {
      display: flex;
      gap: 12px;
    }

    .demo-btn {
      flex: 1;
      padding: 10px 16px;
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .demo-btn:hover {
      background: var(--gray-100);
      border-color: var(--gray-300);
    }

    .auth-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--gray-200);
    }

    .auth-footer p {
      color: var(--gray-500);
      margin: 0;
      font-size: 0.9rem;
    }

    .auth-footer a {
      color: #6366f1;
      font-weight: 600;
      text-decoration: none;
    }

    .auth-footer a:hover {
      text-decoration: underline;
    }
  `],
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  selectedRole = signal<UserRole>('client');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  selectRole(role: UserRole): void {
    this.selectedRole.set(role);
  }

  fillDemoCredentials(role: 'admin' | 'client'): void {
    if (role === 'admin') {
      this.form.patchValue({
        email: 'admin@crypto-erp.com',
        password: 'Admin123!',
      });
      this.selectedRole.set('admin');
    } else {
      this.form.patchValue({
        email: 'client@crypto-erp.com',
        password: 'Client123!',
      });
      this.selectedRole.set('client');
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const credentials = {
      ...this.form.value,
      role: this.selectedRole(),
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error signing in. Please check your credentials.');
      },
    });
  }
}
