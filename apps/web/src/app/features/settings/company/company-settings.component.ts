import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Configuración de Empresa</h1>
        <p class="text-muted">Datos fiscales y configuración general</p>
      </header>

      @if (loading()) {
        <div class="text-center p-lg">
          <span class="spinner"></span>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="card mb-lg">
            <div class="card-header">
              <h3>Datos Fiscales</h3>
            </div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group" style="flex: 2;">
                  <label class="form-label">Razón Social *</label>
                  <input type="text" class="form-input" formControlName="name" />
                </div>
                <div class="form-group">
                  <label class="form-label">NIF/CIF *</label>
                  <input type="text" class="form-input" formControlName="taxId" placeholder="B12345678" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Dirección</label>
                <input type="text" class="form-input" formControlName="address" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ciudad</label>
                  <input type="text" class="form-input" formControlName="city" />
                </div>
                <div class="form-group">
                  <label class="form-label">Código Postal</label>
                  <input type="text" class="form-input" formControlName="postalCode" />
                </div>
                <div class="form-group">
                  <label class="form-label">País</label>
                  <input type="text" class="form-input" formControlName="country" value="España" />
                </div>
              </div>
            </div>
          </div>

          <div class="card mb-lg">
            <div class="card-header">
              <h3>Contacto</h3>
            </div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" formControlName="email" />
                </div>
                <div class="form-group">
                  <label class="form-label">Teléfono</label>
                  <input type="text" class="form-input" formControlName="phone" />
                </div>
                <div class="form-group">
                  <label class="form-label">Web</label>
                  <input type="text" class="form-input" formControlName="website" placeholder="https://" />
                </div>
              </div>
            </div>
          </div>

          @if (success()) {
            <div class="alert alert-success mb-lg">Cambios guardados correctamente</div>
          }

          @if (error()) {
            <div class="alert alert-danger mb-lg">{{ error() }}</div>
          }

          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner"></span>
            }
            Guardar Cambios
          </button>
        </form>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
      max-width: 800px;
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);

      .form-group { flex: 1; }
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);

      &-success { background: #dcfce7; color: #166534; }
      &-danger { background: #fee2e2; color: #991b1b; }
    }
  `],
})
export class CompanySettingsComponent implements OnInit {
  form: FormGroup;
  loading = signal(true);
  saving = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      taxId: ['', Validators.required],
      address: [''],
      city: [''],
      postalCode: [''],
      country: ['España'],
      email: [''],
      phone: [''],
      website: [''],
    });
  }

  ngOnInit(): void {
    this.loadCompany();
  }

  loadCompany(): void {
    this.api.get<any>('/companies/current').subscribe({
      next: (company) => {
        this.form.patchValue(company);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.success.set(false);
    this.error.set(null);

    this.api.put('/companies/current', this.form.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
        setTimeout(() => this.success.set(false), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Error al guardar');
      },
    });
  }
}
