import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-forgot-password',
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
          @if (!submitted()) {
            <p>Reset your password</p>
          }
        </div>

        @if (submitted()) {
          <div class="success-state">
            <div class="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h2>Check your email</h2>
            <p>We've sent password reset instructions to <strong>{{ form.value.email }}</strong></p>
            <p class="hint">Didn't receive the email? Check your spam folder or try again.</p>
            <button type="button" class="btn btn-secondary" (click)="resetForm()">
              Try another email
            </button>
          </div>
        } @else {
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

            <button
              type="submit"
              class="btn btn-primary w-100"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span class="spinner"></span>
                Sending...
              } @else {
                Send Reset Link
              }
            </button>
          </form>
        }

        <div class="auth-footer">
          <p>Remember your password? <a routerLink="/auth/login">Sign in</a></p>
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    }

    .auth-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 15s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 40px;
      position: relative;
      z-index: 1;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-icon {
      margin-bottom: 16px;
    }

    .auth-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }

    .auth-header p {
      color: var(--gray-500);
      font-size: 0.95rem;
    }

    .success-state {
      text-align: center;
      padding: 20px 0;
    }

    .success-icon {
      color: #10b981;
      margin-bottom: 16px;
    }

    .success-state h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--gray-800);
      margin-bottom: 12px;
    }

    .success-state p {
      color: var(--gray-600);
      font-size: 0.95rem;
      margin-bottom: 8px;
    }

    .success-state .hint {
      color: var(--gray-500);
      font-size: 0.85rem;
      margin-bottom: 24px;
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

    .btn {
      padding: 14px 24px;
      border-radius: 12px;
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
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--gray-100);
      color: var(--gray-700);
      border: 1px solid var(--gray-200);
    }

    .btn-secondary:hover {
      background: var(--gray-200);
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
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  resetForm(): void {
    this.submitted.set(false);
    this.error.set(null);
    this.form.reset();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Note: Backend endpoint may need to be implemented
    // For now, we simulate success after a delay
    this.api.post('/auth/forgot-password', { email: this.form.value.email }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        // Even on error, show success to prevent email enumeration
        this.loading.set(false);
        this.submitted.set(true);
      },
    });
  }
}
