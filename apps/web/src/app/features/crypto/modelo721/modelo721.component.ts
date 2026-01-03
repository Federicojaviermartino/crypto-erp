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
          <h1>Modelo 721 - Crypto Asset Declaration</h1>
          <p class="text-muted">Informative declaration on virtual currencies located abroad</p>
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
        <a routerLink="/crypto/transactions" class="nav-tab">Transactions</a>
        <a routerLink="/crypto/assets" class="nav-tab">Assets</a>
        <a routerLink="/crypto/tax-report" class="nav-tab active">Tax Report</a>
      </div>

      <!-- Summary Cards -->
      @if (modelo()) {
        <div class="summary-cards">
          <div class="summary-card" [class.alert-danger]="modelo()?.obligadoDeclarar">
            <span class="summary-icon">📋</span>
            <div class="summary-info">
              <h3>{{ modelo()?.obligadoDeclarar ? 'Yes' : 'No' }}</h3>
              <p>Required to declare</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-icon">💰</span>
            <div class="summary-info">
              <h3>{{ modelo()?.totalValorEur | number:'1.2-2' }} €</h3>
              <p>Total value as of 12/31</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-icon">📊</span>
            <div class="summary-info">
              <h3>{{ modelo()?.posiciones?.length || 0 }}</h3>
              <p>Foreign positions</p>
            </div>
          </div>
          <div class="summary-card" [class.alert-warning]="modelo()?.variacionSignificativa">
            <span class="summary-icon">📈</span>
            <div class="summary-info">
              <h3>{{ modelo()?.variacionSignificativa ? 'Yes' : 'No' }}</h3>
              <p>Significant variation</p>
            </div>
          </div>
        </div>

        <!-- Info Alert -->
        @if (modelo()?.obligadoDeclarar) {
          <div class="alert alert-warning mb-lg">
            <strong>⚠️ Attention:</strong> The total value exceeds €50,000. You are required to file Modelo 721
            before March 31 of the year following the fiscal year.
          </div>
        }

        <!-- Validation -->
        @if (validation()) {
          <div class="card mb-lg">
            <div class="card-header">
              <h3>Validation</h3>
            </div>
            <div class="card-body">
              @if (validation()?.valid) {
                <p class="text-success">✅ All data is complete to file the form.</p>
              } @else {
                <p class="text-danger">❌ There are errors to fix:</p>
                <ul>
                  @for (error of validation()?.errors; track error) {
                    <li class="text-danger">{{ error }}</li>
                  }
                </ul>
              }
              @if (validation()?.warnings?.length) {
                <p class="text-warning">⚠️ Warnings:</p>
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
            📥 Export CSV
          </button>
          <button class="btn btn-secondary" (click)="exportAEAT()">
            📄 Export AEAT Format
          </button>
        </div>
      }

      <!-- Positions Table -->
      <div class="card">
        <div class="card-header">
          <h3>Foreign Positions - Fiscal Year {{ selectedYear }}</h3>
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
                  <th>Cryptocurrency</th>
                  <th>Exchange/Wallet</th>
                  <th>Country</th>
                  <th class="text-right">Balance 12/31</th>
                  <th class="text-right">EUR Value</th>
                  <th class="text-right">Acquisition</th>
                  <th>Acq. Date</th>
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
                      No crypto assets abroad for this fiscal year
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
        <h4>About Modelo 721</h4>
        <ul>
          <li><strong>What is it?</strong> Informative declaration on virtual currencies located abroad.</li>
          <li><strong>Who must file?</strong> Tax residents in Spain with crypto assets in foreign exchanges valued over €50,000.</li>
          <li><strong>When?</strong> Between January 1 and March 31 of the year following the fiscal year.</li>
          <li><strong>Significant variation:</strong> Must be filed if the value increases by more than €20,000 compared to the previous year.</li>
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

  selectedYear = new Date().getFullYear() - 1; // Previous year by default
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
