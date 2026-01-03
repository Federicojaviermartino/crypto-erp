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
          <h1>Crypto Tax Report</h1>
          <p class="text-muted">Realized gains and losses for tax declaration</p>
        </div>
      </header>

      <!-- Period Selection -->
      <div class="card mb-lg">
        <div class="card-body d-flex gap-md align-center">
          <div class="form-group mb-0">
            <label class="form-label">Fiscal Year</label>
            <select class="form-select" [(ngModel)]="selectedYear" (ngModelChange)="updateDates()">
              <option [value]="2024">2024</option>
              <option [value]="2023">2023</option>
              <option [value]="2022">2022</option>
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">From</label>
            <input type="date" class="form-input" [(ngModel)]="startDate" />
          </div>
          <div class="form-group mb-0">
            <label class="form-label">To</label>
            <input type="date" class="form-input" [(ngModel)]="endDate" />
          </div>
          <button class="btn btn-primary" (click)="generateReport()" [disabled]="loading()" style="margin-top: 24px;">
            @if (loading()) {
              <span class="spinner"></span>
            } @else {
              Generate Report
            }
          </button>
        </div>
      </div>

      @if (report()) {
        <!-- Summary -->
        <div class="summary-grid mb-lg">
          <div class="summary-card">
            <h4>Total Proceeds</h4>
            <p class="amount">{{ report()!.summary.totalProceeds | number:'1.2-2' }} €</p>
          </div>
          <div class="summary-card">
            <h4>Total Cost Basis</h4>
            <p class="amount">{{ report()!.summary.totalCostBasis | number:'1.2-2' }} €</p>
          </div>
          <div class="summary-card" [class.positive]="report()!.summary.totalGainLoss > 0" [class.negative]="report()!.summary.totalGainLoss < 0">
            <h4>Total Gain/Loss</h4>
            <p class="amount">{{ report()!.summary.totalGainLoss | number:'1.2-2' }} €</p>
          </div>
        </div>

        <div class="row-2 mb-lg">
          <div class="card">
            <div class="card-header">
              <h3>Short Term (&lt;1 year)</h3>
            </div>
            <div class="card-body text-center">
              <p class="big-number" [class.text-success]="report()!.summary.shortTermGainLoss > 0" [class.text-danger]="report()!.summary.shortTermGainLoss < 0">
                {{ report()!.summary.shortTermGainLoss | number:'1.2-2' }} €
              </p>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3>Long Term (≥1 year)</h3>
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
            <h3>Transaction Details</h3>
            <button class="btn btn-sm btn-secondary">Export CSV</button>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">Proceeds</th>
                  <th class="text-right">Cost</th>
                  <th class="text-right">Gain/Loss</th>
                  <th>Period</th>
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
                        {{ entry.holdingPeriod === 'LONG' ? 'Long' : 'Short' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted p-lg">
                      No transactions in the selected period
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
