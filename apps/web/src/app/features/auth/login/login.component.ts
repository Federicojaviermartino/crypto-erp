import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Crypto ERP</h1>
          <p>Inicia sesión en tu cuenta</p>
        </div>

        @if (error()) {
          <div class="alert alert-danger">
            {{ error() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input
              type="email"
              id="email"
              class="form-input"
              formControlName="email"
              placeholder="tu@email.com"
              [class.is-invalid]="isFieldInvalid('email')"
            />
            @if (isFieldInvalid('email')) {
              <div class="form-error">Email es requerido</div>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input
              type="password"
              id="password"
              class="form-input"
              formControlName="password"
              placeholder="••••••••"
              [class.is-invalid]="isFieldInvalid('password')"
            />
            @if (isFieldInvalid('password')) {
              <div class="form-error">Contraseña es requerida</div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="spinner"></span>
              Iniciando sesión...
            } @else {
              Iniciar sesión
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>¿No tienes una cuenta? <a routerLink="/auth/register">Regístrate</a></p>
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
      background: linear-gradient(135deg, var(--gray-100) 0%, var(--gray-200) 100%);
    }

    .auth-card {
      width: 100%;
      max-width: 400px;
      background: var(--white);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      padding: var(--spacing-2xl);
    }

    .auth-header {
      text-align: center;
      margin-bottom: var(--spacing-xl);

      h1 {
        color: var(--primary);
        margin-bottom: var(--spacing-sm);
      }

      p {
        color: var(--gray-500);
      }
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-md);

      &-danger {
        background-color: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-lg);
      border-top: 1px solid var(--gray-200);

      p {
        color: var(--gray-500);
        margin: 0;
      }
    }
  `],
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
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

    this.authService.login(this.form.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al iniciar sesión');
      },
    });
  }
}
