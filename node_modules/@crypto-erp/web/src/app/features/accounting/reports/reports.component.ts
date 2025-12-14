import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Informes Contables</h1>
        <p class="text-muted">Genera informes financieros</p>
      </header>

      <!-- Report Selection -->
      <div class="reports-grid">
        <div class="report-card" [class.active]="selectedReport() === 'trial-balance'" (click)="selectReport('trial-balance')">
          <span class="report-icon">📊</span>
          <h3>Balance de Comprobación</h3>
          <p>Sumas y saldos de todas las cuentas</p>
        </div>

        <div class="report-card" [class.active]="selectedReport() === 'balance-sheet'" (click)="selectReport('balance-sheet')">
          <span class="report-icon">📋</span>
          <h3>Balance General</h3>
          <p>Activos, pasivos y patrimonio</p>
        </div>

        <div class="report-card" [class.active]="selectedReport() === 'income-statement'" (click)="selectReport('income-statement')">
          <span class="report-icon">📈</span>
          <h3>Cuenta de Resultados</h3>
          <p>Ingresos, gastos y beneficio</p>
        </div>

        <div class="report-card" [class.active]="selectedReport() === 'general-ledger'" (click)="selectReport('general-ledger')">
          <span class="report-icon">📒</span>
          <h3>Libro Mayor</h3>
          <p>Movimientos por cuenta</p>
        </div>
      </div>

      @if (selectedReport()) {
        <!-- Report Filters -->
        <div class="card mb-lg">
          <div class="card-body d-flex gap-md align-center">
            @if (selectedReport() !== 'balance-sheet') {
              <div class="form-group mb-0">
                <label class="form-label">Desde</label>
                <input type="date" class="form-input" [(ngModel)]="startDate" />
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Hasta</label>
                <input type="date" class="form-input" [(ngModel)]="endDate" />
              </div>
            } @else {
              <div class="form-group mb-0">
                <label class="form-label">A fecha de</label>
                <input type="date" class="form-input" [(ngModel)]="asOfDate" />
              </div>
            }
            <button class="btn btn-primary" (click)="generateReport()" [disabled]="loading()" style="margin-top: 24px;">
              @if (loading()) {
                <span class="spinner"></span>
              } @else {
                Generar Informe
              }
            </button>
          </div>
        </div>

        <!-- Report Results -->
        @if (reportData()) {
          <div class="card">
            <div class="card-header d-flex justify-between align-center">
              <h3>{{ getReportTitle() }}</h3>
              <button class="btn btn-sm btn-secondary">Exportar PDF</button>
            </div>
            <div class="card-body">
              @switch (selectedReport()) {
                @case ('trial-balance') {
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Cuenta</th>
                        <th class="text-right">Debe</th>
                        <th class="text-right">Haber</th>
                        <th class="text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of reportData().accounts; track row.accountId) {
                        <tr>
                          <td>{{ row.accountCode }}</td>
                          <td>{{ row.accountName }}</td>
                          <td class="text-right">{{ row.debit | number:'1.2-2' }}</td>
                          <td class="text-right">{{ row.credit | number:'1.2-2' }}</td>
                          <td class="text-right" [class.text-danger]="row.balance < 0">
                            {{ row.balance | number:'1.2-2' }}
                          </td>
                        </tr>
                      }
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2"><strong>TOTALES</strong></td>
                        <td class="text-right"><strong>{{ reportData().totals?.totalDebits | number:'1.2-2' }}</strong></td>
                        <td class="text-right"><strong>{{ reportData().totals?.totalCredits | number:'1.2-2' }}</strong></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                }
                @case ('balance-sheet') {
                  <div class="balance-sheet-grid">
                    <div>
                      <h4>ACTIVO</h4>
                      @for (row of reportData().assets?.accounts; track row.accountId) {
                        <div class="bs-row">
                          <span>{{ row.accountName }}</span>
                          <span>{{ row.balance | number:'1.2-2' }}</span>
                        </div>
                      }
                      <div class="bs-total">
                        <span>Total Activo</span>
                        <span>{{ reportData().assets?.total | number:'1.2-2' }}</span>
                      </div>
                    </div>
                    <div>
                      <h4>PASIVO</h4>
                      @for (row of reportData().liabilities?.accounts; track row.accountId) {
                        <div class="bs-row">
                          <span>{{ row.accountName }}</span>
                          <span>{{ row.balance | number:'1.2-2' }}</span>
                        </div>
                      }
                      <div class="bs-total">
                        <span>Total Pasivo</span>
                        <span>{{ reportData().liabilities?.total | number:'1.2-2' }}</span>
                      </div>
                      <h4 class="mt-lg">PATRIMONIO</h4>
                      @for (row of reportData().equity?.accounts; track row.accountId) {
                        <div class="bs-row">
                          <span>{{ row.accountName }}</span>
                          <span>{{ row.balance | number:'1.2-2' }}</span>
                        </div>
                      }
                      <div class="bs-total">
                        <span>Total Patrimonio</span>
                        <span>{{ reportData().equity?.total | number:'1.2-2' }}</span>
                      </div>
                    </div>
                  </div>
                }
                @default {
                  <pre>{{ reportData() | json }}</pre>
                }
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
    }

    .page-header {
      margin-bottom: var(--spacing-xl);

      p { margin: var(--spacing-xs) 0 0; }
    }

    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .report-card {
      padding: var(--spacing-lg);
      background: var(--white);
      border: 2px solid var(--gray-200);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--primary-light);
        transform: translateY(-2px);
      }

      &.active {
        border-color: var(--primary);
        background: #eff6ff;
      }

      .report-icon {
        font-size: 2rem;
        display: block;
        margin-bottom: var(--spacing-sm);
      }

      h3 {
        margin: 0 0 var(--spacing-xs);
        font-size: 1rem;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--gray-500);
      }
    }

    .balance-sheet-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-xl);
    }

    .bs-row {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--gray-100);
    }

    .bs-total {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-md) 0;
      font-weight: 600;
      border-top: 2px solid var(--gray-300);
      margin-top: var(--spacing-sm);
    }
  `],
})
export class ReportsComponent {
  selectedReport = signal<string | null>(null);
  reportData = signal<any>(null);
  loading = signal(false);

  startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  endDate = new Date().toISOString().split('T')[0];
  asOfDate = new Date().toISOString().split('T')[0];

  constructor(private api: ApiService) {}

  selectReport(report: string): void {
    this.selectedReport.set(report);
    this.reportData.set(null);
  }

  getReportTitle(): string {
    const titles: Record<string, string> = {
      'trial-balance': 'Balance de Comprobación',
      'balance-sheet': 'Balance General',
      'income-statement': 'Cuenta de Resultados',
      'general-ledger': 'Libro Mayor',
    };
    return titles[this.selectedReport() || ''] || '';
  }

  generateReport(): void {
    const report = this.selectedReport();
    if (!report) return;

    this.loading.set(true);

    let params: Record<string, string> = {};
    let endpoint = '';

    switch (report) {
      case 'trial-balance':
        endpoint = '/reports/trial-balance';
        params = { startDate: this.startDate, endDate: this.endDate };
        break;
      case 'balance-sheet':
        endpoint = '/reports/balance-sheet';
        params = { asOfDate: this.asOfDate };
        break;
      case 'income-statement':
        endpoint = '/reports/income-statement';
        params = { startDate: this.startDate, endDate: this.endDate };
        break;
    }

    this.api.get(endpoint, params).subscribe({
      next: (data) => {
        this.reportData.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
