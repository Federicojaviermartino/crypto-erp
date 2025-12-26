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
          <h1>Chart of Accounts</h1>
          <p class="text-muted">Manage your general ledger accounts</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateModal = true">
          + New Account
        </button>
      </header>

      <!-- Filters -->
      <div class="filters card">
        <div class="card-body d-flex gap-md">
          <input
            type="text"
            class="form-input"
            placeholder="Search by code or name..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
            style="max-width: 300px;"
          />
          <select class="form-select" [(ngModel)]="filterType" (ngModelChange)="loadAccounts()" style="max-width: 200px;">
            <option value="">All types</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
            <option value="EQUITY">Equity</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
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
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                        {{ account.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-secondary" (click)="editAccount(account)">
                        Edit
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted p-lg">
                      No accounts found
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
      ASSET: 'Asset',
      LIABILITY: 'Liability',
      EQUITY: 'Equity',
      INCOME: 'Income',
      EXPENSE: 'Expense',
    };
    return labels[type] || type;
  }
}
