import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '@core/services/api.service';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  cryptoGains: number;
}

@Component({
  selector: 'app-monthly-trends',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="trends-widget">
      <div class="widget-header">
        <h3>Tendencias Mensuales</h3>
        <div class="period-selector">
          <button
            *ngFor="let period of periods"
            class="period-btn"
            [class.active]="selectedPeriod() === period.value"
            (click)="changePeriod(period.value)">
            {{ period.label }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <p>Cargando tendencias...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>❌ Error al cargar datos</p>
          <button class="btn btn-sm btn-secondary" (click)="loadData()">Reintentar</button>
        </div>
      } @else if (monthlyData().length === 0) {
        <div class="empty-state">
          <p>📈 No hay datos para mostrar</p>
          <small>Registra facturas y transacciones para ver tendencias</small>
        </div>
      } @else {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData()"
            [type]="'line'"
            [options]="chartOptions">
          </canvas>
        </div>

        <div class="summary-stats">
          <div class="summary-item">
            <span class="summary-label">Ingresos Totales</span>
            <span class="summary-value income">{{ getTotalIncome() | number:'1.2-2' }} EUR</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Gastos Totales</span>
            <span class="summary-value expense">{{ getTotalExpenses() | number:'1.2-2' }} EUR</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Ganancias Crypto</span>
            <span class="summary-value crypto">{{ getTotalCryptoGains() | number:'1.2-2' }} EUR</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .trends-widget {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      box-shadow: var(--shadow-sm);
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
      gap: var(--spacing-sm);

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
      }
    }

    .period-selector {
      display: flex;
      gap: var(--spacing-xs);
      background: var(--gray-100);
      padding: 4px;
      border-radius: var(--radius-md);
    }

    .period-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gray-600);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--gray-200);
      }

      &.active {
        background: var(--white);
        color: var(--primary-600);
        box-shadow: var(--shadow-xs);
      }
    }

    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xxl);
      text-align: center;

      p {
        margin: var(--spacing-sm) 0;
        color: var(--gray-600);
      }

      small {
        color: var(--gray-500);
      }
    }

    .chart-container {
      margin-bottom: var(--spacing-lg);
      min-height: 250px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--spacing-md);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--gray-200);
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .summary-label {
        font-size: 0.875rem;
        color: var(--gray-500);
      }

      .summary-value {
        font-size: 1.25rem;
        font-weight: 700;

        &.income {
          color: #22c55e;
        }

        &.expense {
          color: #ef4444;
        }

        &.crypto {
          color: #f59e0b;
        }
      }
    }
  `],
})
export class MonthlyTrendsComponent implements OnInit {
  loading = signal(true);
  error = signal(false);
  monthlyData = signal<MonthlyData[]>([]);
  selectedPeriod = signal(6);

  periods = [
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
  ];

  chartData = signal<ChartConfiguration<'line'>['data']>({
    labels: [],
    datasets: [],
  });

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value.toFixed(2)} EUR`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value} EUR`,
        },
      },
    },
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  changePeriod(months: number): void {
    this.selectedPeriod.set(months);
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    this.api.get<{ monthlyTrends: MonthlyData[] }>(
      `/analytics/charts/monthly?months=${this.selectedPeriod()}`
    ).subscribe({
      next: (data) => {
        if (!data.monthlyTrends || data.monthlyTrends.length === 0) {
          this.monthlyData.set([]);
          this.loading.set(false);
          return;
        }

        this.monthlyData.set(data.monthlyTrends);

        // Update chart data
        this.chartData.set({
          labels: data.monthlyTrends.map(d => d.month),
          datasets: [
            {
              label: 'Ingresos',
              data: data.monthlyTrends.map(d => d.income),
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: 'Gastos',
              data: data.monthlyTrends.map(d => d.expenses),
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: 'Ganancias Crypto',
              data: data.monthlyTrends.map(d => d.cryptoGains),
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              tension: 0.4,
              fill: true,
            },
          ],
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load monthly trends:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getTotalIncome(): number {
    return this.monthlyData().reduce((sum, d) => sum + d.income, 0);
  }

  getTotalExpenses(): number {
    return this.monthlyData().reduce((sum, d) => sum + d.expenses, 0);
  }

  getTotalCryptoGains(): number {
    return this.monthlyData().reduce((sum, d) => sum + d.cryptoGains, 0);
  }
}
