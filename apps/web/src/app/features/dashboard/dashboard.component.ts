import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { PortfolioChartComponent } from './widgets/portfolio-chart.component';
import { MonthlyTrendsComponent } from './widgets/monthly-trends.component';
import { AiInsightsComponent } from './widgets/ai-insights.component';
import { OnboardingWizardComponent } from '@shared/components/onboarding-wizard/onboarding-wizard.component';

interface DashboardStats {
  totalAccounts: number;
  totalInvoices: number;
  pendingInvoices: number;
  cryptoAssets: number;
  totalBalance: number;
}

interface QuickAction {
  label: string;
  path: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PortfolioChartComponent,
    MonthlyTrendsComponent,
    AiInsightsComponent,
    OnboardingWizardComponent,
  ],
  template: `
    <div class="dashboard">
      <header class="page-header">
        <h1>Dashboard</h1>
        <p class="welcome">Welcome back, {{ authService.currentUser()?.firstName }}</p>
      </header>

      <!-- Onboarding Wizard -->
      <app-onboarding-wizard />

      @if (!hasCompany()) {
        <!-- No Company Message -->
        <div class="no-company-card">
          <div class="no-company-icon">🏢</div>
          <h2>Welcome to Crypto ERP!</h2>
          <p>To get started, you need to create or join a company. Go to Settings to set up your company profile.</p>
          <a routerLink="/settings/company" class="btn btn-primary">Set Up Company</a>
        </div>
      } @else {
        <!-- Quick Actions -->
        <section class="quick-actions">
          @for (action of quickActions; track action.path) {
            <a [routerLink]="action.path" class="action-card" [style.border-color]="action.color">
              <span class="action-icon">{{ action.icon }}</span>
              <span class="action-label">{{ action.label }}</span>
            </a>
          }
        </section>

        <!-- Stats Cards -->
        <section class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background: #dbeafe;">📒</div>
            <div class="stat-info">
              <h3>{{ stats().totalAccounts }}</h3>
              <p>Accounts</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #dcfce7;">🧾</div>
            <div class="stat-info">
              <h3>{{ stats().totalInvoices }}</h3>
              <p>Total Invoices</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #fef3c7;">⏳</div>
            <div class="stat-info">
              <h3>{{ stats().pendingInvoices }}</h3>
              <p>Pending Invoices</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon" style="background: #f3e8ff;">₿</div>
            <div class="stat-info">
              <h3>{{ stats().cryptoAssets }}</h3>
              <p>Crypto Assets</p>
            </div>
          </div>
        </section>

        <!-- Charts & Analytics -->
        <section class="charts-section">
          <app-monthly-trends />
        </section>

        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Portfolio Chart -->
          <app-portfolio-chart />

          <!-- AI Insights -->
          <app-ai-insights />
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      padding: var(--spacing-xl);
    }

    .page-header {
      margin-bottom: var(--spacing-xl);

      h1 {
        margin-bottom: var(--spacing-xs);
      }

      .welcome {
        color: var(--gray-500);
        margin: 0;
      }
    }

    .no-company-card {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xxl);
      text-align: center;
      box-shadow: var(--shadow-md);
      max-width: 500px;
      margin: var(--spacing-xxl) auto;

      .no-company-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
      }

      h2 {
        margin: 0 0 var(--spacing-md);
        color: var(--gray-800);
      }

      p {
        color: var(--gray-600);
        margin: 0 0 var(--spacing-lg);
        line-height: 1.6;
      }

      .btn {
        display: inline-block;
        padding: var(--spacing-md) var(--spacing-xl);
        background: var(--primary);
        color: white;
        text-decoration: none;
        border-radius: var(--radius-md);
        font-weight: 500;
        transition: all var(--transition-fast);

        &:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
        }
      }
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-lg);
      background: var(--white);
      border-radius: var(--radius-lg);
      border: 2px solid var(--gray-200);
      text-decoration: none;
      color: var(--gray-700);
      transition: all var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .action-icon {
        font-size: 2rem;
      }

      .action-label {
        font-weight: 500;
        text-align: center;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .charts-section {
      margin-bottom: var(--spacing-xl);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .stat-info {
      h3 {
        font-size: 1.5rem;
        margin: 0;
      }

      p {
        margin: 0;
        color: var(--gray-500);
        font-size: 0.875rem;
      }
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard {
        padding: var(--spacing-md);
      }

      .quick-actions {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  hasCompany = computed(() => !!this.authService.getCompanyId());
  stats = signal<DashboardStats>({
    totalAccounts: 0,
    totalInvoices: 0,
    pendingInvoices: 0,
    cryptoAssets: 0,
    totalBalance: 0,
  });

  quickActions: QuickAction[] = [
    { label: 'New Invoice', path: '/invoicing/invoices/new', icon: '➕', color: '#22c55e' },
    { label: 'New Entry', path: '/accounting/journal-entries/new', icon: '📝', color: '#3b82f6' },
    { label: 'New Transaction', path: '/crypto/transactions/new', icon: '₿', color: '#f59e0b' },
    { label: 'View Reports', path: '/accounting/reports', icon: '📊', color: '#8b5cf6' },
  ];

  constructor(
    public authService: AuthService,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    // Only load stats if user has a company
    if (!this.authService.getCompanyId()) {
      this.loading.set(false);
      return;
    }

    this.api.get<{
      totalCostBasis: number;
      monthlyActivity: number;
      pendingInvoices: number;
      portfolioDistribution: Array<{ name: string; value: number }>;
    }>('/analytics/dashboard').subscribe({
      next: (data) => {
        this.stats.set({
          totalAccounts: 0,
          totalInvoices: 0,
          pendingInvoices: data.pendingInvoices || 0,
          cryptoAssets: data.portfolioDistribution?.length || 0,
          totalBalance: data.totalCostBasis || 0,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
