import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface ExchangeInfo {
  id: string;
  name: string;
  country: string;
  logo: string;
  supported: boolean;
}

interface ExchangeAccount {
  id: string;
  exchange: string;
  label: string;
  apiKey: string;
  country: string;
  syncStatus: string;
  lastSyncAt: string | null;
  createdAt: string;
}

interface ExchangeBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

@Component({
  selector: 'app-exchanges-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Exchanges</h1>
          <p class="text-muted">Connect your exchange accounts to import transactions</p>
        </div>
        <div class="d-flex gap-md">
          <button class="btn btn-primary" (click)="showAddModal = true">+ Add Exchange</button>
        </div>
      </header>

      <!-- Navigation -->
      <div class="nav-tabs mb-lg">
        <a routerLink="/crypto/portfolio" class="nav-tab">Portfolio</a>
        <a routerLink="/crypto/wallets" class="nav-tab">Wallets</a>
        <a routerLink="/crypto/exchanges" class="nav-tab active">Exchanges</a>
        <a routerLink="/crypto/transactions" class="nav-tab">Transactions</a>
        <a routerLink="/crypto/assets" class="nav-tab">Assets</a>
        <a routerLink="/crypto/tax-report" class="nav-tab">Tax Report</a>
      </div>

      <!-- Supported Exchanges Grid -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3>Supported Exchanges</h3>
        </div>
        <div class="card-body">
          <div class="exchanges-grid">
            @for (exchange of supportedExchanges(); track exchange.id) {
              <div
                class="exchange-card"
                [class.supported]="exchange.supported"
                [class.coming-soon]="!exchange.supported"
                (click)="exchange.supported && selectExchange(exchange)"
              >
                <div class="exchange-logo">
                  @if (exchange.logo) {
                    <img [src]="exchange.logo" [alt]="exchange.name" />
                  } @else {
                    <span class="exchange-initial">{{ exchange.name.charAt(0) }}</span>
                  }
                </div>
                <div class="exchange-details">
                  <span class="exchange-name">{{ exchange.name }}</span>
                  <span class="exchange-country">{{ exchange.country }}</span>
                </div>
                @if (!exchange.supported) {
                  <span class="coming-soon-badge">Coming Soon</span>
                }
              </div>
            } @empty {
              <div class="text-center text-muted p-lg">
                Loading exchanges...
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Connected Exchanges -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3>Connected Exchanges</h3>
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
                  <th>Exchange</th>
                  <th>Label</th>
                  <th>API Key</th>
                  <th>Status</th>
                  <th>Last Sync</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (account of accounts(); track account.id) {
                  <tr>
                    <td>
                      <div class="exchange-info">
                        <strong>{{ getExchangeName(account.exchange) }}</strong>
                        <small>{{ account.country }}</small>
                      </div>
                    </td>
                    <td>{{ account.label }}</td>
                    <td><code>{{ account.apiKey }}</code></td>
                    <td>
                      <span class="badge" [class]="getSyncStatusClass(account.syncStatus)">
                        {{ getSyncStatusLabel(account.syncStatus) }}
                      </span>
                    </td>
                    <td>{{ account.lastSyncAt ? (account.lastSyncAt | date:'short') : 'Never' }}</td>
                    <td>
                      <div class="d-flex gap-sm">
                        <button class="btn btn-sm btn-secondary" (click)="viewBalances(account)" title="View balances">
                          💰
                        </button>
                        <button class="btn btn-sm btn-primary" (click)="syncAccount(account)"
                                [disabled]="account.syncStatus === 'SYNCING'" title="Sync">
                          🔄
                        </button>
                        <button class="btn btn-sm btn-danger" (click)="deleteAccount(account)" title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted p-lg">
                      No exchanges connected
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- Add Exchange Modal -->
      @if (showAddModal) {
        <div class="modal-overlay" (click)="showAddModal = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Add Exchange</h3>
              <button class="btn-close" (click)="showAddModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Exchange</label>
                <select class="form-control" [(ngModel)]="newAccount.exchange">
                  @for (ex of supportedExchanges(); track ex.id) {
                    @if (ex.supported) {
                      <option [value]="ex.id">{{ ex.name }}</option>
                    }
                  }
                </select>
              </div>
              <div class="form-group">
                <label>Label (optional)</label>
                <input type="text" class="form-control" [(ngModel)]="newAccount.label"
                       placeholder="My main account">
              </div>
              <div class="form-group">
                <label>API Key</label>
                <input type="text" class="form-control" [(ngModel)]="newAccount.apiKey"
                       placeholder="Your API Key">
              </div>
              <div class="form-group">
                <label>API Secret</label>
                <input type="password" class="form-control" [(ngModel)]="newAccount.apiSecret"
                       placeholder="Your API Secret">
              </div>
              <div class="alert alert-info">
                <strong>Required permissions:</strong> Read-only.
                You don't need trading or withdrawal permissions.
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showAddModal = false">Cancel</button>
              <button class="btn btn-primary" (click)="addAccount()"
                      [disabled]="!newAccount.exchange || !newAccount.apiKey || !newAccount.apiSecret || saving()">
                {{ saving() ? 'Connecting...' : 'Connect' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Balances Modal -->
      @if (showBalancesModal) {
        <div class="modal-overlay" (click)="showBalancesModal = false">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Balances - {{ selectedAccount?.label }}</h3>
              <button class="btn-close" (click)="showBalancesModal = false">×</button>
            </div>
            <div class="modal-body">
              @if (loadingBalances()) {
                <div class="text-center p-lg">
                  <span class="spinner"></span>
                </div>
              } @else {
                <table class="table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th class="text-right">Available</th>
                      <th class="text-right">Locked</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (balance of balances(); track balance.asset) {
                      <tr>
                        <td><strong>{{ balance.asset }}</strong></td>
                        <td class="text-right">{{ balance.free | number:'1.8-8' }}</td>
                        <td class="text-right">{{ balance.locked | number:'1.8-8' }}</td>
                        <td class="text-right">{{ balance.total | number:'1.8-8' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="text-center text-muted">No balances</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showBalancesModal = false">Close</button>
            </div>
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
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-xl);
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

    .exchange-info {
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

      &.badge-success {
        background: var(--success-light);
        color: var(--success);
      }

      &.badge-warning {
        background: var(--warning-light);
        color: var(--warning);
      }

      &.badge-danger {
        background: var(--danger-light);
        color: var(--danger);
      }

      &.badge-info {
        background: var(--info-light);
        color: var(--info);
      }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--white);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: var(--shadow-lg);

      &.modal-lg {
        max-width: 700px;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--gray-200);

      h3 {
        margin: 0;
      }
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--gray-500);

      &:hover {
        color: var(--gray-700);
      }
    }

    .modal-body {
      padding: var(--spacing-lg);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--gray-200);
    }

    .form-group {
      margin-bottom: var(--spacing-md);

      label {
        display: block;
        margin-bottom: var(--spacing-xs);
        font-weight: 500;
      }
    }

    .form-control {
      width: 100%;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 1px solid var(--gray-300);
      border-radius: var(--radius-md);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      margin-top: var(--spacing-md);

      &.alert-info {
        background: var(--info-light);
        color: var(--info);
        border: 1px solid var(--info);
      }
    }

    code {
      background: var(--gray-100);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-family: monospace;
    }

    // Exchanges Grid
    .exchanges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--spacing-md);
    }

    .exchange-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-lg);
      border: 2px solid var(--gray-200);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--transition-fast);
      position: relative;
      text-align: center;

      &.supported {
        &:hover {
          border-color: var(--primary);
          background: var(--gray-50);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
      }

      &.coming-soon {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--gray-50);
      }
    }

    .exchange-logo {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-100);
      margin-bottom: var(--spacing-sm);

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .exchange-initial {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }

    .exchange-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .exchange-name {
      font-weight: 600;
      color: var(--gray-900);
    }

    .exchange-country {
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .coming-soon-badge {
      position: absolute;
      top: var(--spacing-sm);
      right: var(--spacing-sm);
      background: var(--warning);
      color: white;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
    }
  `],
})
export class ExchangesListComponent implements OnInit {
  accounts = signal<ExchangeAccount[]>([]);
  supportedExchanges = signal<ExchangeInfo[]>([]);
  balances = signal<ExchangeBalance[]>([]);
  loading = signal(true);
  saving = signal(false);
  loadingBalances = signal(false);

  showAddModal = false;
  showBalancesModal = false;
  selectedAccount: ExchangeAccount | null = null;

  newAccount = {
    exchange: 'binance',
    label: '',
    apiKey: '',
    apiSecret: '',
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSupportedExchanges();
    this.loadAccounts();
  }

  loadSupportedExchanges(): void {
    this.api.get<ExchangeInfo[]>('/crypto/exchanges/supported').subscribe({
      next: (data) => this.supportedExchanges.set(data),
    });
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.api.get<ExchangeAccount[]>('/crypto/exchanges/accounts').subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getExchangeName(exchangeId: string): string {
    const exchange = this.supportedExchanges().find(e => e.id === exchangeId);
    return exchange?.name || exchangeId;
  }

  selectExchange(exchange: ExchangeInfo): void {
    this.newAccount.exchange = exchange.id;
    this.showAddModal = true;
  }

  getSyncStatusClass(status: string): string {
    const classes: Record<string, string> = {
      SYNCED: 'badge-success',
      SYNCING: 'badge-info',
      PENDING: 'badge-warning',
      ERROR: 'badge-danger',
    };
    return classes[status] || 'badge-secondary';
  }

  getSyncStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      SYNCED: 'Synced',
      SYNCING: 'Syncing...',
      PENDING: 'Pending',
      ERROR: 'Error',
    };
    return labels[status] || status;
  }

  addAccount(): void {
    if (!this.newAccount.exchange || !this.newAccount.apiKey || !this.newAccount.apiSecret) {
      return;
    }

    this.saving.set(true);
    this.api.post('/crypto/exchanges/accounts', this.newAccount).subscribe({
      next: () => {
        this.showAddModal = false;
        this.newAccount = { exchange: 'binance', label: '', apiKey: '', apiSecret: '' };
        this.loadAccounts();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  viewBalances(account: ExchangeAccount): void {
    this.selectedAccount = account;
    this.showBalancesModal = true;
    this.loadingBalances.set(true);

    this.api.get<ExchangeBalance[]>(`/crypto/exchanges/accounts/${account.id}/balances`).subscribe({
      next: (data) => {
        this.balances.set(data);
        this.loadingBalances.set(false);
      },
      error: () => {
        this.balances.set([]);
        this.loadingBalances.set(false);
      },
    });
  }

  syncAccount(account: ExchangeAccount): void {
    this.api.post<{ trades: number; deposits: number; withdrawals: number }>(
      `/crypto/exchanges/accounts/${account.id}/sync/all`, {}
    ).subscribe({
      next: (result) => {
        alert(`Sync completed:\n- Trades: ${result.trades}\n- Deposits: ${result.deposits}\n- Withdrawals: ${result.withdrawals}`);
        this.loadAccounts();
      },
      error: (err) => {
        alert('Error syncing: ' + err.message);
      },
    });
  }

  deleteAccount(account: ExchangeAccount): void {
    if (!confirm(`Delete connection with ${account.label}?`)) {
      return;
    }

    this.api.delete(`/crypto/exchanges/accounts/${account.id}`).subscribe({
      next: () => this.loadAccounts(),
    });
  }
}
