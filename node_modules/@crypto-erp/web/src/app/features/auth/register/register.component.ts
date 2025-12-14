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
          <h1>Crypto ERP</h1>
          <p>Crea tu cuenta</p>
        </div>

        @if (error()) {
          <div class="alert alert-danger">
            {{ error() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="firstName">Nombre</label>
              <input
                type="text"
                id="firstName"
                class="form-input"
                formControlName="firstName"
                placeholder="Juan"
                [class.is-invalid]="isFieldInvalid('firstName')"
              />
              @if (isFieldInvalid('firstName')) {
                <div class="form-error">Nombre es requerido</div>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="lastName">Apellido</label>
              <input
                type="text"
                id="lastName"
                class="form-input"
                formControlName="lastName"
                placeholder="García"
                [class.is-invalid]="isFieldInvalid('lastName')"
              />
              @if (isFieldInvalid('lastName')) {
                <div class="form-error">Apellido es requerido</div>
              }
            </div>
          </div>

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
              <div class="form-error">Email válido es requerido</div>
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
              <div class="form-error">Mínimo 8 caracteres</div>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              class="form-input"
              formControlName="confirmPassword"
              placeholder="••••••••"
              [class.is-invalid]="isFieldInvalid('confirmPassword') || passwordMismatch()"
            />
            @if (passwordMismatch()) {
              <div class="form-error">Las contraseñas no coinciden</div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="spinner"></span>
              Creando cuenta...
            } @else {
              Crear cuenta
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>¿Ya tienes una cuenta? <a routerLink="/auth/login">Inicia sesión</a></p>
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
      max-width: 450px;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
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
        this.error.set(err.error?.message || 'Error al crear la cuenta');
      },
    });
  }
}
