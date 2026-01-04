import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId: string | null;
  isActive: boolean;
}

@Component({
  selector: 'app-assets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Crypto Assets</h1>
          <p class="text-muted">Manage your cryptocurrency assets</p>
        </div>
        <button class="btn btn-primary" (click)="showModal = true">
          + New Asset
        </button>
      </header>

      <div class="card">
        <div class="card-body" style="padding: 0;">
          @if (loading()) {
            <div class="text-center p-lg">
              <span class="spinner"></span>
            </div>
          } @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Decimals</th>
                  <th>CoinGecko ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (asset of assets(); track asset.id) {
                  <tr>
                    <td><strong>{{ asset.symbol }}</strong></td>
                    <td>{{ asset.name }}</td>
                    <td>{{ asset.decimals }}</td>
                    <td>{{ asset.coingeckoId || '-' }}</td>
                    <td>
                      <span class="badge" [class]="asset.isActive ? 'badge-success' : 'badge-secondary'">
                        {{ asset.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-secondary" (click)="editAsset(asset)">Edit</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <app-empty-state
                        icon="₿"
                        title="No crypto assets yet"
                        description="Configure your first cryptocurrency to track prices and manage your portfolio"
                        actionText="+ New Asset"
                        (action)="showModal = true"
                        [features]="['Track any cryptocurrency', 'Auto price updates via CoinGecko', 'Portfolio valuation']"
                        color="amber"
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

      <!-- Create/Edit Modal -->
      @if (showModal) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingAsset ? 'Edit Crypto Asset' : 'New Crypto Asset' }}</h3>
              <button class="close-btn" (click)="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Symbol *</label>
                  <input type="text" class="form-input" [(ngModel)]="newAsset.symbol" placeholder="BTC" />
                </div>
                <div class="form-group">
                  <label class="form-label">Decimals</label>
                  <input type="number" class="form-input" [(ngModel)]="newAsset.decimals" min="0" max="18" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Name *</label>
                <input type="text" class="form-input" [(ngModel)]="newAsset.name" placeholder="Bitcoin" />
              </div>
              <div class="form-group">
                <label class="form-label">CoinGecko ID (for price data)</label>
                <input type="text" class="form-input" [(ngModel)]="newAsset.coingeckoId" placeholder="bitcoin" />
              </div>
              @if (saveError) {
                <div class="alert alert-danger">{{ saveError }}</div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveAsset()" [disabled]="!newAsset.symbol || !newAsset.name || saving()">
                {{ saving() ? 'Saving...' : (editingAsset ? 'Update' : 'Create') }}
              </button>
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

    .form-row {
      display: flex;
      gap: var(--spacing-md);

      .form-group { flex: 1; }
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
      max-width: 450px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--gray-200);

      h3 { margin: 0; }
      .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
    }

    .modal-body { padding: var(--spacing-lg); }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--gray-200);
    }

    .alert-danger {
      padding: var(--spacing-md);
      background: var(--danger-light);
      color: var(--danger);
      border-radius: var(--radius-md);
      margin-top: var(--spacing-md);
    }
  `],
})
export class AssetsListComponent implements OnInit {
  assets = signal<CryptoAsset[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = false;
  editingAsset: CryptoAsset | null = null;
  saveError = '';

  newAsset = {
    symbol: '',
    name: '',
    decimals: 8,
    coingeckoId: '',
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    this.loading.set(true);
    this.api.get<CryptoAsset[]>('/crypto/assets').subscribe({
      next: (assets) => {
        this.assets.set(assets);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  editAsset(asset: CryptoAsset): void {
    this.editingAsset = asset;
    this.newAsset = {
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      coingeckoId: asset.coingeckoId || '',
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingAsset = null;
    this.saveError = '';
    this.newAsset = { symbol: '', name: '', decimals: 8, coingeckoId: '' };
  }

  saveAsset(): void {
    if (!this.newAsset.symbol || !this.newAsset.name) {
      return;
    }

    this.saving.set(true);
    this.saveError = '';

    const payload = {
      symbol: this.newAsset.symbol,
      name: this.newAsset.name,
      decimals: this.newAsset.decimals,
      coingeckoId: this.newAsset.coingeckoId || null,
    };

    const request = this.editingAsset
      ? this.api.put(`/crypto/assets/${this.editingAsset.id}`, payload)
      : this.api.post('/crypto/assets', payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadAssets();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError = err.error?.message || 'Error saving asset';
      },
    });
  }
}
