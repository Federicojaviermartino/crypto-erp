import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-register',
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
          <p>Create your account</p>
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
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="firstName">First Name</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  id="firstName"
                  class="form-input"
                  formControlName="firstName"
                  placeholder="John"
                  [class.is-invalid]="isFieldInvalid('firstName')"
                />
              </div>
              @if (isFieldInvalid('firstName')) {
                <div class="form-error">First name is required</div>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="lastName">Last Name</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  type="text"
                  id="lastName"
                  class="form-input"
                  formControlName="lastName"
                  placeholder="Doe"
                  [class.is-invalid]="isFieldInvalid('lastName')"
                />
              </div>
              @if (isFieldInvalid('lastName')) {
                <div class="form-error">Last name is required</div>
              }
            </div>
          </div>

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
            <label class="form-label" for="password">Password</label>
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
                placeholder="Minimum 8 characters"
                [class.is-invalid]="isFieldInvalid('password')"
              />
            </div>
            @if (isFieldInvalid('password')) {
              <div class="form-error">Minimum 8 characters required</div>
            }
            @if (form.get('password')?.value) {
              <div class="password-strength">
                <div class="strength-bars">
                  <div class="strength-bar" [class.active]="passwordStrength() >= 1" [class]="strengthClass()"></div>
                  <div class="strength-bar" [class.active]="passwordStrength() >= 2" [class]="strengthClass()"></div>
                  <div class="strength-bar" [class.active]="passwordStrength() >= 3" [class]="strengthClass()"></div>
                  <div class="strength-bar" [class.active]="passwordStrength() >= 4" [class]="strengthClass()"></div>
                </div>
                <span class="strength-text" [class]="strengthClass()">{{ strengthLabel() }}</span>
              </div>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm Password</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                id="confirmPassword"
                class="form-input"
                formControlName="confirmPassword"
                placeholder="Re-enter your password"
                [class.is-invalid]="isFieldInvalid('confirmPassword') || passwordMismatch()"
              />
            </div>
            @if (passwordMismatch()) {
              <div class="form-error">Passwords do not match</div>
            }
          </div>

          <div class="terms-row">
            <label class="checkbox-wrapper" [class.is-invalid]="isFieldInvalid('acceptTerms')">
              <input type="checkbox" formControlName="acceptTerms" />
              <span class="checkmark"></span>
              <span class="checkbox-label">
                I agree to the <a href="#" (click)="$event.preventDefault()">Terms of Service</a> and <a href="#" (click)="$event.preventDefault()">Privacy Policy</a>
              </span>
            </label>
            @if (isFieldInvalid('acceptTerms')) {
              <div class="form-error">You must accept the terms to continue</div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="spinner"></span>
              Creating account...
            } @else {
              Create Account
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/auth/login">Sign in</a></p>
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
      max-width: 480px;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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

    .password-strength {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }

    .strength-bars {
      display: flex;
      gap: 4px;
      flex: 1;
    }

    .strength-bar {
      height: 4px;
      flex: 1;
      background: var(--gray-200);
      border-radius: 2px;
      transition: background-color 0.2s ease;
    }

    .strength-bar.active.weak {
      background: #ef4444;
    }

    .strength-bar.active.fair {
      background: #f59e0b;
    }

    .strength-bar.active.good {
      background: #10b981;
    }

    .strength-bar.active.strong {
      background: #059669;
    }

    .strength-text {
      font-size: 0.8rem;
      font-weight: 500;
      min-width: 50px;
    }

    .strength-text.weak {
      color: #ef4444;
    }

    .strength-text.fair {
      color: #f59e0b;
    }

    .strength-text.good {
      color: #10b981;
    }

    .strength-text.strong {
      color: #059669;
    }

    .terms-row {
      margin-bottom: 20px;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: flex-start;
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
      min-width: 20px;
      border: 2px solid var(--gray-300);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      background: var(--white);
      margin-top: 2px;
    }

    .checkbox-wrapper:hover .checkmark {
      border-color: #6366f1;
    }

    .checkbox-wrapper.is-invalid .checkmark {
      border-color: #ef4444;
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
      line-height: 1.4;
    }

    .checkbox-label a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }

    .checkbox-label a:hover {
      text-decoration: underline;
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

    @media (max-width: 480px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class RegisterComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  passwordMismatch(): boolean {
    const password = this.form.get('password');
    const confirmPassword = this.form.get('confirmPassword');
    return !!(
      confirmPassword?.touched &&
      password?.value !== confirmPassword?.value
    );
  }

  passwordStrength(): number {
    const password = this.form.get('password')?.value || '';
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    return strength;
  }

  strengthClass(): string {
    const strength = this.passwordStrength();
    if (strength <= 1) return 'weak';
    if (strength === 2) return 'fair';
    if (strength === 3) return 'good';
    return 'strong';
  }

  strengthLabel(): string {
    const strength = this.passwordStrength();
    if (strength <= 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    return 'Strong';
  }

  onSubmit(): void {
    if (this.form.invalid || this.passwordMismatch()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { confirmPassword, ...data } = this.form.value;

    this.authService.register(data).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error creating account. Please try again.');
      },
    });
  }
}
