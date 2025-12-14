import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  parentId: string | null;
}

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Plan de Cuentas</h1>
          <p class="text-muted">Gestiona el plan general contable</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateModal = true">
          + Nueva Cuenta
        </button>
      </header>

      <!-- Filters -->
      <div class="filters card">
        <div class="card-body d-flex gap-md">
          <input
            type="text"
            class="form-input"
            placeholder="Buscar por código o nombre..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
            style="max-width: 300px;"
          />
          <select class="form-select" [(ngModel)]="filterType" (ngModelChange)="loadAccounts()" style="max-width: 200px;">
            <option value="">Todos los tipos</option>
            <option value="ASSET">Activo</option>
            <option value="LIABILITY">Pasivo</option>
            <option value="EQUITY">Patrimonio</option>
            <option value="INCOME">Ingreso</option>
            <option value="EXPENSE">Gasto</option>
          </select>
        </div>
      </div>

      <!-- Accounts Table -->
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
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (account of accounts(); track account.id) {
                  <tr>
                    <td><strong>{{ account.code }}</strong></td>
                    <td>{{ account.name }}</td>
                    <td>
                      <span class="badge" [class]="getTypeBadgeClass(account.type)">
                        {{ getTypeLabel(account.type) }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" [class]="account.isActive ? 'badge-success' : 'badge-secondary'">
                        {{ account.isActive ? 'Activa' : 'Inactiva' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-secondary" (click)="editAccount(account)">
                        Editar
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted p-lg">
                      No se encontraron cuentas
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
      margin-bottom: var(--spacing-lg);

      h1 { margin-bottom: var(--spacing-xs); }
      p { margin: 0; }
    }

    .filters {
      margin-bottom: var(--spacing-lg);
    }
  `],
})
export class AccountsListComponent implements OnInit {
  accounts = signal<Account[]>([]);
  loading = signal(true);
  searchTerm = '';
  filterType = '';
  showCreateModal = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);

    const params: Record<string, string> = {};
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.filterType) params['type'] = this.filterType;

    this.api.get<Account[]>('/accounts', params).subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    // Debounce search
    setTimeout(() => this.loadAccounts(), 300);
  }

  editAccount(account: Account): void {
    console.log('Edit account:', account);
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      ASSET: 'badge-info',
      LIABILITY: 'badge-warning',
      EQUITY: 'badge-success',
      INCOME: 'badge-success',
      EXPENSE: 'badge-danger',
    };
    return classes[type] || 'badge-secondary';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ASSET: 'Activo',
      LIABILITY: 'Pasivo',
      EQUITY: 'Patrimonio',
      INCOME: 'Ingreso',
      EXPENSE: 'Gasto',
    };
    return labels[type] || type;
  }
}
