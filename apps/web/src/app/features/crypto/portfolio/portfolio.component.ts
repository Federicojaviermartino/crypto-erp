import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

interface PortfolioPosition {
  assetId: string;
  symbol: string;
  name: string;
  totalAmount: number;
  totalCostBasis: number;
  averageCostBasis: number;
}

interface PortfolioSummary {
  positions: PortfolioPosition[];
  totalCostBasis: number;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Crypto Portfolio</h1>
          <p class="text-muted">Summary of your digital assets</p>
        </div>
        <div class="d-flex gap-md">
          <a routerLink="/crypto/transactions/new" class="btn btn-primary">+ New Transaction</a>
        </div>
      </header>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-icon">💰</span>
          <div class="summary-info">
            <h3>{{ (portfolio()?.totalCostBasis ?? 0) | number:'1.2-2' }} €</h3>
            <p>Total Cost Basis</p>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📊</span>
          <div class="summary-info">
            <h3>{{ portfolio()?.positions?.length || 0 }}</h3>
            <p>Active Positions</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="nav-tabs mb-lg">
        <a routerLink="/crypto/portfolio" class="nav-tab active">Portfolio</a>
        <a routerLink="/crypto/wallets" class="nav-tab">Wallets</a>
        <a routerLink="/crypto/exchanges" class="nav-tab">Exchanges</a>
        <a routerLink="/crypto/transactions" class="nav-tab">Transactions</a>
        <a routerLink="/crypto/assets" class="nav-tab">Assets</a>
        <a routerLink="/crypto/tax-report" class="nav-tab">Tax Report</a>
      </div>

      <!-- Positions Table -->
      <div class="card">
        <div class="card-header">
          <h3>Positions</h3>
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
                  <th>Asset</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">Average Cost</th>
                  <th class="text-right">Total Cost Basis</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (position of portfolio()?.positions; track position.assetId) {
                  <tr>
                    <td>
                      <div class="asset-info">
                        <strong>{{ position.symbol }}</strong>
                        <small>{{ position.name }}</small>
                      </div>
                    </td>
                    <td class="text-right">{{ position.totalAmount | number:'1.8-8' }}</td>
                    <td class="text-right">{{ position.averageCostBasis | number:'1.2-2' }} €</td>
                    <td class="text-right">{{ position.totalCostBasis | number:'1.2-2' }} €</td>
                    <td>
                      <a routerLink="/crypto/transactions" [queryParams]="{assetId: position.assetId}" class="btn btn-sm btn-secondary">
                        View Transactions
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5">
                      <app-empty-state
                        icon="📈"
                        title="No open positions"
                        description="Start building your portfolio by recording your first crypto transaction"
                        actionText="+ New Transaction"
                        (action)="navigateToNewTransaction()"
                        [features]="['Track holdings across assets', 'Monitor cost basis & P/L', 'Generate tax reports']"
                        color="purple"
                        variant="compact"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
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
  `],
})
export class PortfolioComponent implements OnInit {
  portfolio = signal<PortfolioSummary | null>(null);
  loading = signal(true);

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadPortfolio();
  }

  loadPortfolio(): void {
    this.loading.set(true);
    this.api.get<PortfolioSummary>('/crypto/transactions/portfolio').subscribe({
      next: (data) => {
        this.portfolio.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  navigateToNewTransaction(): void {
    this.router.navigate(['/crypto/transactions/new']);
  }
}
