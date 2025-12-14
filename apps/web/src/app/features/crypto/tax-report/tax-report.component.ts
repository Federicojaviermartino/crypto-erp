import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface TaxEntry {
  transactionId: string;
  date: string;
  type: string;
  assetSymbol: string;
  amount: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  holdingPeriod: string;
}

interface TaxReport {
  entries: TaxEntry[];
  summary: {
    totalProceeds: number;
    totalCostBasis: number;
    totalGainLoss: number;
    shortTermGainLoss: number;
    longTermGainLoss: number;
  };
}

@Component({
  selector: 'app-tax-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Informe Fiscal Crypto</h1>
          <p class="text-muted">Ganancias y pérdidas realizadas para declaración</p>
        </div>
      </header>

      <!-- Period Selection -->
      <div class="card mb-lg">
        <div class="card-body d-flex gap-md align-center">
          <div class="form-group mb-0">
            <label class="form-label">Año Fiscal</label>
            <select class="form-select" [(ngModel)]="selectedYear" (ngModelChange)="updateDates()">
              <option [value]="2024">2024</option>
              <option [value]="2023">2023</option>
              <option [value]="2022">2022</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Desde</label>
            <input type="date" class="form-input" [(ngModel)]="startDate" />
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-input" [(ngModel)]="endDate" />
          </div>
          <button class="btn btn-primary" (click)="generateReport()" [disabled]="loading()" style="margin-top: 24px;">
            @if (loading()) {
              <span class="spinner"></span>
            } @else {
              Generar Informe
            }
          </button>
        </div>
      </div>

      @if (report()) {
        <!-- Summary -->
        <div class="summary-grid mb-lg">
          <div class="summary-card">
            <h4>Ventas Totales</h4>
            <p class="amount">{{ report()!.summary.totalProceeds | number:'1.2-2' }} €</p>
          </div>
          <div class="summary-card">
            <h4>Costo Base Total</h4>
            <p class="amount">{{ report()!.summary.totalCostBasis | number:'1.2-2' }} €</p>
          </div>
          <div class="summary-card" [class.positive]="report()!.summary.totalGainLoss > 0" [class.negative]="report()!.summary.totalGainLoss < 0">
            <h4>Ganancia/Pérdida Total</h4>
            <p class="amount">{{ report()!.summary.totalGainLoss | number:'1.2-2' }} €</p>
          </div>
        </div>

        <div class="row-2 mb-lg">
          <div class="card">
            <div class="card-header">
              <h3>Corto Plazo (&lt;1 año)</h3>
            </div>
            <div class="card-body text-center">
              <p class="big-number" [class.text-success]="report()!.summary.shortTermGainLoss > 0" [class.text-danger]="report()!.summary.shortTermGainLoss < 0">
                {{ report()!.summary.shortTermGainLoss | number:'1.2-2' }} €
              </p>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3>Largo Plazo (≥1 año)</h3>
            </div>
            <div class="card-body text-center">
              <p class="big-number" [class.text-success]="report()!.summary.longTermGainLoss > 0" [class.text-danger]="report()!.summary.longTermGainLoss < 0">
                {{ report()!.summary.longTermGainLoss | number:'1.2-2' }} €
              </p>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <div class="card">
          <div class="card-header d-flex justify-between align-center">
            <h3>Detalle de Operaciones</h3>
            <button class="btn btn-sm btn-secondary">Exportar CSV</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Activo</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Venta</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Ganancia/Pérdida</th>
                  <th>Período</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of report()!.entries; track entry.transactionId) {
                  <tr>
                    <td>{{ entry.date | date:'dd/MM/yyyy' }}</td>
                    <td><strong>{{ entry.assetSymbol }}</strong></td>
                    <td class="text-right">{{ entry.amount | number:'1.8-8' }}</td>
                    <td class="text-right">{{ entry.proceeds | number:'1.2-2' }} €</td>
                    <td class="text-right">{{ entry.costBasis | number:'1.2-2' }} €</td>
                    <td class="text-right" [class.text-success]="entry.gainLoss > 0" [class.text-danger]="entry.gainLoss < 0">
                      {{ entry.gainLoss | number:'1.2-2' }} €
                    </td>
                    <td>
                      <span class="badge" [class]="entry.holdingPeriod === 'LONG' ? 'badge-info' : 'badge-warning'">
                        {{ entry.holdingPeriod === 'LONG' ? 'Largo' : 'Corto' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted p-lg">
                      No hay operaciones en el período seleccionado
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
    }

    .page-header {
      margin-bottom: var(--spacing-lg);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-md);
    }

    .summary-card {
      background: var(--white);
      padding: var(--spacing-lg);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      text-align: center;

      h4 {
        margin: 0 0 var(--spacing-sm);
        color: var(--gray-500);
        font-size: 0.875rem;
      }

      .amount {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      &.positive { background: #dcfce7; .amount { color: #166534; } }
      &.negative { background: #fee2e2; .amount { color: #991b1b; } }
    }

    .row-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-md);
    }

    .big-number {
      font-size: 2rem;
      font-weight: 600;
      margin: 0;
    }
  `],
})
export class TaxReportComponent {
  report = signal<TaxReport | null>(null);
  loading = signal(false);

  selectedYear = 2024;
  startDate = `${this.selectedYear}-01-01`;
  endDate = `${this.selectedYear}-12-31`;

  constructor(private api: ApiService) {}

  updateDates(): void {
    this.startDate = `${this.selectedYear}-01-01`;
    this.endDate = `${this.selectedYear}-12-31`;
  }

  generateReport(): void {
    this.loading.set(true);

    this.api.get<TaxReport>('/crypto/transactions/tax-report', {
      startDate: this.startDate,
      endDate: this.endDate,
    }).subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
