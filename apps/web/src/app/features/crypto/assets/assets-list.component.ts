import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Activos Crypto</h1>
          <p class="text-muted">Gestiona tus criptoactivos</p>
        </div>
        <button class="btn btn-primary" (click)="showModal = true">
          + Nuevo Activo
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
                  <th>Símbolo</th>
                  <th>Nombre</th>
                  <th>Decimales</th>
                  <th>CoinGecko ID</th>
                  <th>Estado</th>
                  <th>Acciones</th>
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
                        {{ asset.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-secondary">Editar</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted p-lg">
                      No hay activos configurados
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      <!-- Create Modal -->
      @if (showModal) {
        <div class="modal-backdrop" (click)="showModal = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Nuevo Activo Crypto</h3>
              <button class="close-btn" (click)="showModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Símbolo *</label>
                  <input type="text" class="form-input" [(ngModel)]="newAsset.symbol" placeholder="BTC" />
                </div>
                <div class="form-group">
                  <label class="form-label">Decimales</label>
                  <input type="number" class="form-input" [(ngModel)]="newAsset.decimals" min="0" max="18" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" class="form-input" [(ngModel)]="newAsset.name" placeholder="Bitcoin" />
              </div>
              <div class="form-group">
                <label class="form-label">CoinGecko ID</label>
                <input type="text" class="form-input" [(ngModel)]="newAsset.coingeckoId" placeholder="bitcoin" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showModal = false">Cancelar</button>
              <button class="btn btn-primary" (click)="createAsset()">Crear</button>
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
  `],
})
export class AssetsListComponent implements OnInit {
  assets = signal<CryptoAsset[]>([]);
  loading = signal(true);
  showModal = false;

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

  createAsset(): void {
    this.api.post('/crypto/assets', this.newAsset).subscribe({
      next: () => {
        this.showModal = false;
        this.newAsset = { symbol: '', name: '', decimals: 8, coingeckoId: '' };
        this.loadAssets();
      },
    });
  }
}
