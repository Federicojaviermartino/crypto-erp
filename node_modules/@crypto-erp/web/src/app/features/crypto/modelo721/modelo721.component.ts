import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface Modelo721Position {
  tipoMoneda: string;
  nombreMoneda: string;
  claveExchange: string;
  nombreExchange: string;
  paisExchange: string;
  saldoAFinDeAno: number;
  valorEurAFinDeAno: number;
  fechaAdquisicion: string;
  valorAdquisicionEur: number;
  porcentajeTitularidad: number;
}

interface Modelo721Summary {
  ejercicio: number;
  fechaGeneracion: string;
  totalValorEur: number;
  posiciones: Modelo721Position[];
  obligadoDeclarar: boolean;
  variacionSignificativa: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Component({
  selector: 'app-modelo721',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Modelo 721 - Declaración de Criptoactivos</h1>
          <p class="text-muted">Declaración informativa sobre monedas virtuales situadas en el extranjero</p>
        </div>
        <div class="d-flex gap-md">
          <select class="form-control" [(ngModel)]="selectedYear" (change)="loadData()">
            @for (year of availableYears; track year) {
              <option [value]="year">{{ year }}</option>
            }
          </select>
        </div>
      </header>

      <!-- Navigation -->
      <div class="nav-tabs mb-lg">
        <a routerLink="/crypto/portfolio" class="nav-tab">Portfolio</a>
        <a routerLink="/crypto/wallets" class="nav-tab">Wallets</a>
        <a routerLink="/crypto/exchanges" class="nav-tab">Exchanges</a>
        <a routerLink="/crypto/transactions" class="nav-tab">Transacciones</a>
        <a routerLink="/crypto/assets" class="nav-tab">Activos</a>
        <a routerLink="/crypto/tax-report" class="nav-tab active">Informe Fiscal</a>
      </div>

      <!-- Summary Cards -->
      @if (modelo()) {
        <div class="summary-cards">
          <div class="summary-card" [class.alert-danger]="modelo()?.obligadoDeclarar">
            <span class="summary-icon">📋</span>
            <div class="summary-info">
              <h3>{{ modelo()?.obligadoDeclarar ? 'Sí' : 'No' }}</h3>
              <p>Obligado a declarar</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-icon">💰</span>
            <div class="summary-info">
              <h3>{{ modelo()?.totalValorEur | number:'1.2-2' }} €</h3>
              <p>Valor total a 31/12</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-icon">📊</span>
            <div class="summary-info">
              <h3>{{ modelo()?.posiciones?.length || 0 }}</h3>
              <p>Posiciones en el extranjero</p>
            </div>
          </div>
          <div class="summary-card" [class.alert-warning]="modelo()?.variacionSignificativa">
            <span class="summary-icon">📈</span>
            <div class="summary-info">
              <h3>{{ modelo()?.variacionSignificativa ? 'Sí' : 'No' }}</h3>
              <p>Variación significativa</p>
            </div>
          </div>
        </div>

        <!-- Info Alert -->
        @if (modelo()?.obligadoDeclarar) {
          <div class="alert alert-warning mb-lg">
            <strong>⚠️ Atención:</strong> El valor total supera 50.000 €. Estás obligado a presentar el Modelo 721
            antes del 31 de marzo del año siguiente al ejercicio fiscal.
          </div>
        }

        <!-- Validation -->
        @if (validation()) {
          <div class="card mb-lg">
            <div class="card-header">
              <h3>Validación</h3>
            </div>
            <div class="card-body">
              @if (validation()?.valid) {
                <p class="text-success">✅ Todos los datos están completos para presentar el modelo.</p>
              } @else {
                <p class="text-danger">❌ Hay errores que corregir:</p>
                <ul>
                  @for (error of validation()?.errors; track error) {
                    <li class="text-danger">{{ error }}</li>
                  }
                </ul>
              }
              @if (validation()?.warnings?.length) {
                <p class="text-warning">⚠️ Advertencias:</p>
                <ul>
                  @for (warning of validation()?.warnings; track warning) {
                    <li class="text-warning">{{ warning }}</li>
                  }
                </ul>
              }
            </div>
          </div>
        }

        <!-- Export Buttons -->
        <div class="d-flex gap-md mb-lg">
          <button class="btn btn-primary" (click)="exportCSV()">
            📥 Exportar CSV
          </button>
          <button class="btn btn-secondary" (click)="exportAEAT()">
            📄 Exportar formato AEAT
          </button>
        </div>
      }

      <!-- Positions Table -->
      <div class="card">
        <div class="card-header">
          <h3>Posiciones en el Extranjero - Ejercicio {{ selectedYear }}</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          @if (loading()) {
            <div class="text-center p-lg">
              <span class="spinner"></span>
            </div>
          } @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Criptomoneda</th>
                  <th>Exchange/Wallet</th>
                  <th>País</th>
                  <th class="text-right">Saldo 31/12</th>
                  <th class="text-right">Valor EUR</th>
                  <th class="text-right">Adquisición</th>
                  <th>Fecha Adq.</th>
                </tr>
              </thead>
              <tbody>
                @for (pos of modelo()?.posiciones; track pos.tipoMoneda + pos.claveExchange) {
                  <tr>
                    <td>
                      <div class="asset-info">
                        <strong>{{ pos.tipoMoneda }}</strong>
                        <small>{{ pos.nombreMoneda }}</small>
                      </div>
                    </td>
                    <td>{{ pos.nombreExchange }}</td>
                    <td>
                      <span class="badge badge-secondary">{{ pos.paisExchange }}</span>
                    </td>
                    <td class="text-right">{{ pos.saldoAFinDeAno | number:'1.8-8' }}</td>
                    <td class="text-right">{{ pos.valorEurAFinDeAno | number:'1.2-2' }} €</td>
                    <td class="text-right">{{ pos.valorAdquisicionEur | number:'1.2-2' }} €</td>
                    <td>{{ pos.fechaAdquisicion | date:'shortDate' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted p-lg">
                      No tienes criptoactivos en el extranjero para este ejercicio
                    </td>
                  </tr>
                }
              </tbody>
              @if (modelo()?.posiciones?.length) {
                <tfoot>
                  <tr>
                    <td colspan="4" class="text-right"><strong>Total:</strong></td>
                    <td class="text-right"><strong>{{ modelo()?.totalValorEur | number:'1.2-2' }} €</strong></td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              }
            </table>
          }
        </div>
      </div>

      <!-- Info Section -->
      <div class="info-section mt-lg">
        <h4>Información sobre el Modelo 721</h4>
        <ul>
          <li><strong>¿Qué es?</strong> Declaración informativa sobre monedas virtuales situadas en el extranjero.</li>
          <li><strong>¿Quién debe presentarlo?</strong> Residentes fiscales en España con criptoactivos en exchanges extranjeros cuyo valor supere 50.000 €.</li>
          <li><strong>¿Cuándo?</strong> Entre el 1 de enero y el 31 de marzo del año siguiente al ejercicio.</li>
          <li><strong>Variación significativa:</strong> Se debe presentar si el valor aumenta más de 20.000 € respecto al año anterior.</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-xl);
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);

      &.alert-danger {
        background: var(--danger-light);
        border: 1px solid var(--danger);
      }

      &.alert-warning {
        background: var(--warning-light);
        border: 1px solid var(--warning);
      }

      .summary-icon {
        font-size: 2rem;
      }

      .summary-info h3 {
        margin: 0;
        font-size: 1.5rem;
      }

      .summary-info p {
        margin: 0;
        color: var(--gray-500);
        font-size: 0.875rem;
      }
    }

    .nav-tabs {
      display: flex;
      gap: var(--spacing-sm);
      border-bottom: 2px solid var(--gray-200);
      padding-bottom: var(--spacing-sm);
    }

    .nav-tab {
      padding: var(--spacing-sm) var(--spacing-lg);
      color: var(--gray-500);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -10px;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--gray-700);
      }

      &.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
      }
    }

    .asset-info {
      display: flex;
      flex-direction: column;

      small {
        color: var(--gray-500);
      }
    }

    .badge {
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 500;

      &.badge-secondary {
        background: var(--gray-200);
        color: var(--gray-700);
      }
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);

      &.alert-warning {
        background: var(--warning-light);
        color: var(--warning-dark);
        border: 1px solid var(--warning);
      }
    }

    .form-control {
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      font-size: 1rem;
    }

    .info-section {
      background: var(--gray-50);
      padding: var(--spacing-lg);
      border-radius: var(--radius-md);

      h4 {
        margin-bottom: var(--spacing-md);
      }

      ul {
        margin: 0;
        padding-left: var(--spacing-lg);
      }

      li {
        margin-bottom: var(--spacing-sm);
      }
    }

    .text-success {
      color: var(--success);
    }

    .text-danger {
      color: var(--danger);
    }

    .text-warning {
      color: var(--warning);
    }
  `],
})
export class Modelo721Component implements OnInit {
  modelo = signal<Modelo721Summary | null>(null);
  validation = signal<ValidationResult | null>(null);
  loading = signal(true);

  selectedYear = new Date().getFullYear() - 1; // Año anterior por defecto
  availableYears: number[] = [];

  constructor(private api: ApiService) {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year >= 2020; year--) {
      this.availableYears.push(year);
    }
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Load modelo and validation in parallel
    this.api.get<Modelo721Summary>(`/fiscal/modelo721/${this.selectedYear}`).subscribe({
      next: (data) => {
        this.modelo.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.modelo.set(null);
        this.loading.set(false);
      },
    });

    this.api.get<ValidationResult>(`/fiscal/modelo721/${this.selectedYear}/validate`).subscribe({
      next: (data) => this.validation.set(data),
      error: () => this.validation.set(null),
    });
  }

  exportCSV(): void {
    window.open(`/api/fiscal/modelo721/${this.selectedYear}/export/csv`, '_blank');
  }

  exportAEAT(): void {
    window.open(`/api/fiscal/modelo721/${this.selectedYear}/export/aeat`, '_blank');
  }
}
