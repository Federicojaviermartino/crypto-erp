import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { ApiService } from '@core/services/api.service';

interface PortfolioAsset {
  name: string;
  value: number;
  valueEur: number;
  color: string;
}

@Component({
  selector: 'app-portfolio-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="portfolio-chart-widget">
      <div class="widget-header">
        <h3>Portfolio Distribution</h3>
        <span class="total-value">{{ totalValue() | number:'1.2-2' }} EUR</span>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <p>Loading portfolio...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>❌ Error loading data</p>
          <button class="btn btn-sm btn-secondary" (click)="loadData()">Retry</button>
        </div>
      } @else if (portfolioData().length === 0) {
        <div class="empty-state">
          <p>📊 No crypto assets registered</p>
          <small>Add your first wallet to see the distribution</small>
        </div>
      } @else {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData()"
            [type]="'doughnut'"
            [options]="chartOptions">
          </canvas>
        </div>

        <div class="legend">
          @for (asset of portfolioData(); track asset.name) {
            <div class="legend-item">
              <span class="legend-color" [style.background-color]="asset.color"></span>
              <span class="legend-label">{{ asset.name }}</span>
              <span class="legend-value">{{ asset.valueEur | number:'1.2-2' }} EUR</span>
              <span class="legend-percent">{{ getPercentage(asset.valueEur) }}%</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .portfolio-chart-widget {
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

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
      }

      .total-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--primary-600);
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
      max-width: 300px;
      margin: 0 auto var(--spacing-lg);
    }

    .legend {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--gray-50);
      }
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }

    .legend-label {
      flex: 1;
      font-weight: 500;
    }

    .legend-value {
      font-weight: 600;
      color: var(--gray-700);
    }

    .legend-percent {
      font-size: 0.875rem;
      color: var(--gray-500);
      min-width: 45px;
      text-align: right;
    }
  `],
})
export class PortfolioChartComponent implements OnInit {
  loading = signal(true);
  error = signal(false);
  portfolioData = signal<PortfolioAsset[]>([]);
  totalValue = signal(0);

  chartData = signal<ChartConfiguration<'doughnut'>['data']>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 0,
      hoverOffset: 10,
    }],
  });

  chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // Using custom legend
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = this.getPercentage(value);
            return `${label}: ${value.toFixed(2)} EUR (${percentage}%)`;
          },
        },
      },
    },
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    this.api.get<{
      portfolioDistribution: Array<{ name: string; value: number; valueEur: number }>;
      totalCostBasis: number;
    }>('/analytics/dashboard').subscribe({
      next: (data) => {
        if (!data.portfolioDistribution || data.portfolioDistribution.length === 0) {
          this.portfolioData.set([]);
          this.totalValue.set(0);
          this.loading.set(false);
          return;
        }

        // Assign colors to assets
        const colors = [
          '#f59e0b', // Bitcoin - Amber
          '#3b82f6', // Ethereum - Blue
          '#8b5cf6', // Others - Purple
          '#22c55e', // Green
          '#ef4444', // Red
          '#06b6d4', // Cyan
          '#ec4899', // Pink
          '#14b8a6', // Teal
        ];

        const portfolio = data.portfolioDistribution.map((asset, index) => ({
          ...asset,
          color: colors[index % colors.length],
        }));

        this.portfolioData.set(portfolio);
        this.totalValue.set(data.totalCostBasis);

        // Update chart data
        this.chartData.set({
          labels: portfolio.map(p => p.name),
          datasets: [{
            data: portfolio.map(p => p.valueEur),
            backgroundColor: portfolio.map(p => p.color),
            borderWidth: 0,
            hoverOffset: 10,
          }],
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load portfolio data:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getPercentage(value: number): string {
    const total = this.totalValue();
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }
}
