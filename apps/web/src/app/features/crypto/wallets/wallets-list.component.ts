import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

interface Wallet {
  id: string;
  address: string;
  chain: string;
  label: string | null;
  type: 'EXTERNAL' | 'EXCHANGE' | 'DEFI' | 'COLD';
  lastSyncAt: string | null;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR';
  syncError: string | null;
  isActive: boolean;
}

interface WalletBalance {
  contract_ticker_symbol: string;
  balance: string;
  quote: number;
  logo_url?: string;
}

const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  bsc: 'BNB Chain',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  avalanche: 'Avalanche',
};

const WALLET_TYPES: Record<string, string> = {
  EXTERNAL: 'External',
  EXCHANGE: 'Exchange',
  DEFI: 'DeFi',
  COLD: 'Cold Storage',
};

@Component({
  selector: 'app-wallets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Blockchain Wallets</h1>
          <p class="text-muted">Manage your wallets and sync transactions</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" (click)="syncAllWallets()" [disabled]="syncingAll()">
            @if (syncingAll()) {
              <span class="spinner-sm"></span>
            }
            Sync All
          </button>
          <button class="btn btn-primary" (click)="showModal = true">
            + Add Wallet
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="text-center p-xl">
          <span class="spinner"></span>
        </div>
      } @else {
        <div class="wallets-grid">
          @for (wallet of wallets(); track wallet.id) {
            <div class="wallet-card" [class.syncing]="wallet.syncStatus === 'SYNCING'">
              <div class="wallet-header">
                <div class="wallet-chain">
                  <span class="chain-badge" [attr.data-chain]="wallet.chain">
                    {{ getChainName(wallet.chain) }}
                  </span>
                  <span class="wallet-type">{{ getWalletType(wallet.type) }}</span>
                </div>
                <div class="wallet-status">
                  @if (wallet.syncStatus === 'SYNCING') {
                    <span class="status-badge syncing">
                      <span class="spinner-xs"></span> Syncing
                    </span>
                  } @else if (wallet.syncStatus === 'SYNCED') {
                    <span class="status-badge synced">Synced</span>
                  } @else if (wallet.syncStatus === 'ERROR') {
                    <span class="status-badge error" [title]="wallet.syncError || ''">Error</span>
                  } @else {
                    <span class="status-badge pending">Pending</span>
                  }
                </div>
              </div>

              <div class="wallet-body">
                <h3 class="wallet-label">{{ wallet.label || 'Unnamed' }}</h3>
                <p class="wallet-address" [title]="wallet.address">
                  {{ truncateAddress(wallet.address) }}
                  <button class="copy-btn" (click)="copyAddress(wallet.address)">Copy</button>
                </p>

                @if (wallet.lastSyncAt) {
                  <p class="wallet-sync-time">
                    Last sync: {{ wallet.lastSyncAt | date:'dd/MM/yyyy HH:mm' }}
                  </p>
                }
              </div>

              <div class="wallet-actions">
                <button
                  class="btn btn-sm btn-secondary"
                  (click)="syncWallet(wallet)"
                  [disabled]="wallet.syncStatus === 'SYNCING'"
                >
                  Sync
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  (click)="viewBalances(wallet)"
                >
                  View Balances
                </button>
                <button class="btn btn-sm btn-secondary" (click)="editWallet(wallet)">
                  Edit
                </button>
              </div>
            </div>
          } @empty {
            <app-empty-state
              icon="💳"
              title="No wallets configured"
              description="Add your first blockchain wallet to start syncing transactions and tracking balances"
              actionText="+ Add Wallet"
              (action)="showModal = true"
              [features]="['Track multiple chains', 'Auto-sync transactions', 'View real-time balances']"
              color="amber"
            />
          }
        </div>
      }

      <!-- Add/Edit Wallet Modal -->
      @if (showModal) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingWallet ? 'Edit' : 'Add' }} Wallet</h3>
              <button class="close-btn" (click)="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Address *</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="walletForm.address"
                  placeholder="0x..."
                  [disabled]="!!editingWallet"
                />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Blockchain *</label>
                  <select class="form-select" [(ngModel)]="walletForm.chain" [disabled]="!!editingWallet">
                    <option value="">Select</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                    <option value="bsc">BNB Chain</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="optimism">Optimism</option>
                    <option value="base">Base</option>
                    <option value="avalanche">Avalanche</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Type</label>
                  <select class="form-select" [(ngModel)]="walletForm.type">
                    <option value="EXTERNAL">External</option>
                    <option value="EXCHANGE">Exchange</option>
                    <option value="DEFI">DeFi</option>
                    <option value="COLD">Cold Storage</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Label</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="walletForm.label"
                  placeholder="My Main Wallet"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Account Code</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="walletForm.accountCode"
                  placeholder="5700001"
                />
                <small class="form-hint">Accounting code for automatic journal entries</small>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveWallet()" [disabled]="saving()">
                @if (saving()) {
                  <span class="spinner-sm"></span>
                }
                {{ editingWallet ? 'Save' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Balances Modal -->
      @if (showBalancesModal && selectedWallet) {
        <div class="modal-backdrop" (click)="showBalancesModal = false">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Balances: {{ selectedWallet.label || truncateAddress(selectedWallet.address) }}</h3>
              <button class="close-btn" (click)="showBalancesModal = false">&times;</button>
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
                      <th>Token</th>
                      <th class="text-right">Balance</th>
                      <th class="text-right">EUR Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (balance of balances(); track balance.contract_ticker_symbol) {
                      <tr>
                        <td>
                          <div class="token-cell">
                            @if (balance.logo_url) {
                              <img [src]="balance.logo_url" class="token-logo" />
                            }
                            <strong>{{ balance.contract_ticker_symbol }}</strong>
                          </div>
                        </td>
                        <td class="text-right">{{ formatBalance(balance.balance) }}</td>
                        <td class="text-right">{{ balance.quote | number:'1.2-2' }} EUR</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="text-center text-muted p-lg">
                          No balances available
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                @if (totalValue()) {
                  <div class="total-value">
                    Total: <strong>{{ totalValue() | number:'1.2-2' }} EUR</strong>
                  </div>
                }
              }
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
      margin-bottom: var(--spacing-lg);
    }

    .header-actions {
      display: flex;
      gap: var(--spacing-md);
    }

    .wallets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--spacing-lg);
    }

    .wallet-card {
      background: var(--white);
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      overflow: hidden;
      transition: all var(--transition-normal);

      &:hover {
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.syncing {
        border-color: var(--warning);
      }
    }

    .wallet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
    }

    .wallet-chain {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .chain-badge {
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--gray-200);
      color: var(--gray-700);

      &[data-chain="ethereum"] { background: #627eea20; color: #627eea; }
      &[data-chain="polygon"] { background: #8247e520; color: #8247e5; }
      &[data-chain="bsc"] { background: #f3ba2f20; color: #c9a227; }
      &[data-chain="arbitrum"] { background: #28a0f020; color: #28a0f0; }
      &[data-chain="optimism"] { background: #ff042020; color: #ff0420; }
      &[data-chain="base"] { background: #0052ff20; color: #0052ff; }
      &[data-chain="avalanche"] { background: #e8414420; color: #e84142; }
    }

    .wallet-type {
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 500;

      &.synced { background: #dcfce7; color: #166534; }
      &.syncing { background: #fef3c7; color: #92400e; }
      &.error { background: #fee2e2; color: #991b1b; }
      &.pending { background: var(--gray-100); color: var(--gray-600); }
    }

    .wallet-body {
      padding: var(--spacing-lg);
    }

    .wallet-label {
      margin: 0 0 var(--spacing-sm);
      font-size: 1.125rem;
    }

    .wallet-address {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--gray-500);
      margin: 0;
    }

    .copy-btn {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0;

      &:hover { text-decoration: underline; }
    }

    .wallet-sync-time {
      margin: var(--spacing-sm) 0 0;
      font-size: 0.75rem;
      color: var(--gray-400);
    }

    .wallet-actions {
      display: flex;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-top: 1px solid var(--gray-100);
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);
      .form-group { flex: 1; }
    }

    .form-hint {
      display: block;
      margin-top: var(--spacing-xs);
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .modal-backdrop {
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
      overflow: hidden;

      &.modal-lg { max-width: 700px; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--gray-200);
      h3 { margin: 0; }
      .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
    }

    .modal-body {
      padding: var(--spacing-lg);
      overflow-y: auto;
      max-height: 60vh;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--gray-200);
    }

    .token-cell {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .token-logo {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }

    .total-value {
      text-align: right;
      padding: var(--spacing-md);
      background: var(--gray-50);
      border-radius: var(--radius-md);
      margin-top: var(--spacing-md);
      font-size: 1.125rem;
    }

    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    .spinner-xs {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class WalletsListComponent implements OnInit {
  wallets = signal<Wallet[]>([]);
  balances = signal<WalletBalance[]>([]);
  loading = signal(true);
  loadingBalances = signal(false);
  saving = signal(false);
  syncingAll = signal(false);
  totalValue = signal(0);

  showModal = false;
  showBalancesModal = false;
  editingWallet: Wallet | null = null;
  selectedWallet: Wallet | null = null;

  walletForm: {
    address: string;
    chain: string;
    label: string;
    type: 'EXTERNAL' | 'EXCHANGE' | 'DEFI' | 'COLD';
    accountCode: string;
  } = {
    address: '',
    chain: '',
    label: '',
    type: 'EXTERNAL',
    accountCode: '',
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadWallets();
  }

  loadWallets(): void {
    this.loading.set(true);
    this.api.get<{ wallets: Wallet[] }>('/crypto/wallets').subscribe({
      next: (response) => {
        this.wallets.set(response.wallets || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  saveWallet(): void {
    if (!this.walletForm.address || !this.walletForm.chain) {
      return;
    }

    this.saving.set(true);

    if (this.editingWallet) {
      this.api.put(`/crypto/wallets/${this.editingWallet.id}`, {
        label: this.walletForm.label,
        type: this.walletForm.type,
        accountCode: this.walletForm.accountCode || null,
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadWallets();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.api.post('/crypto/wallets', this.walletForm).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadWallets();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  editWallet(wallet: Wallet): void {
    this.editingWallet = wallet;
    this.walletForm = {
      address: wallet.address,
      chain: wallet.chain,
      label: wallet.label || '',
      type: wallet.type,
      accountCode: '',
    };
    this.showModal = true;
  }

  syncWallet(wallet: Wallet): void {
    // Optimistic update
    this.wallets.update(wallets =>
      wallets.map(w => w.id === wallet.id ? { ...w, syncStatus: 'SYNCING' as const } : w)
    );

    this.api.post(`/crypto/sync/wallet/${wallet.id}`, {}).subscribe({
      next: () => this.loadWallets(),
      error: () => this.loadWallets(),
    });
  }

  syncAllWallets(): void {
    this.syncingAll.set(true);
    this.api.post('/crypto/sync/all', {}).subscribe({
      next: () => {
        this.syncingAll.set(false);
        this.loadWallets();
      },
      error: () => {
        this.syncingAll.set(false);
        this.loadWallets();
      },
    });
  }

  viewBalances(wallet: Wallet): void {
    this.selectedWallet = wallet;
    this.showBalancesModal = true;
    this.loadingBalances.set(true);

    this.api.get<any>(`/crypto/wallets/${wallet.id}/balances`).subscribe({
      next: (response) => {
        this.balances.set(response.balances || []);
        this.totalValue.set(response.totalValueEur || 0);
        this.loadingBalances.set(false);
      },
      error: () => {
        this.balances.set([]);
        this.totalValue.set(0);
        this.loadingBalances.set(false);
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingWallet = null;
    this.walletForm = {
      address: '',
      chain: '',
      label: '',
      type: 'EXTERNAL',
      accountCode: '',
    };
  }

  getChainName(chain: string): string {
    return CHAIN_NAMES[chain] || chain;
  }

  getWalletType(type: string): string {
    return WALLET_TYPES[type] || type;
  }

  truncateAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatBalance(balance: string): string {
    const num = parseFloat(balance);
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    if (num < 0.0001) return '<0.0001';
    return num.toFixed(4);
  }

  copyAddress(address: string): void {
    navigator.clipboard.writeText(address);
  }
}
