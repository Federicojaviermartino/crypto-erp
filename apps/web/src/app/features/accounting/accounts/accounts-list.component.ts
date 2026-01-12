import { Component, OnInit, signal, HostListener, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '@core/services/api.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';

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
  imports: [CommonModule, FormsModule, EmptyStateComponent, SkeletonLoaderComponent],
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
            <app-skeleton-loader
              type="table"
              [rowCount]="6"
              [columnWidths]="['15%', '30%', '20%', '15%', '20%']"
            />
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
                    <td colspan="5">
                      <app-empty-state
                        icon="book"
                        title="No accounts yet"
                        description="Create your first account to start organizing your chart of accounts"
                        actionText="+ New Account"
                        (action)="showCreateModal = true"
                        [features]="['Organize finances by category', 'Track assets, liabilities & equity', 'Generate financial reports']"
                        color="blue"
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

      <!-- Create Account Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="showCreateModal = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingAccount ? 'Edit Account' : 'New Account' }}</h3>
              <button class="btn-close" (click)="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Code *</label>
                <input type="text" class="form-control" [(ngModel)]="newAccount.code"
                       placeholder="e.g., 100, 4300, 57200"
                       [class.is-invalid]="formErrors.code">
                @if (formErrors.code) {
                  <span class="error-text">{{ formErrors.code }}</span>
                }
              </div>
              <div class="form-group">
                <label>Name *</label>
                <input type="text" class="form-control" [(ngModel)]="newAccount.name"
                       placeholder="Account name"
                       [class.is-invalid]="formErrors.name">
                @if (formErrors.name) {
                  <span class="error-text">{{ formErrors.name }}</span>
                }
              </div>
              <div class="form-group">
                <label>Type *</label>
                <select class="form-control" [(ngModel)]="newAccount.type"
                        [class.is-invalid]="formErrors.type">
                  <option value="">Select type...</option>
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
                @if (formErrors.type) {
                  <span class="error-text">{{ formErrors.type }}</span>
                }
              </div>
              <div class="form-group">
                <label>Parent Account Code (optional)</label>
                <input type="text" class="form-control" [(ngModel)]="newAccount.parentCode"
                       placeholder="e.g., 572 for sub-accounts of Banks">
                <span class="help-text">Enter the parent account code if this is a sub-account</span>
              </div>
              <div class="form-group">
                <label>Description (optional)</label>
                <input type="text" class="form-control" [(ngModel)]="newAccount.description"
                       placeholder="Optional description">
              </div>
              @if (saveError) {
                <div class="alert alert-danger">{{ saveError }}</div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveAccount()"
                      [disabled]="!newAccount.code || !newAccount.name || !newAccount.type || saving()">
                {{ saving() ? 'Saving...' : (editingAccount ? 'Update' : 'Create') }}
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

      h1 { margin-bottom: var(--spacing-xs); }
      p { margin: 0; }
    }

    .filters {
      margin-bottom: var(--spacing-lg);
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
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--gray-200);

      h3 { margin: 0; }
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--gray-500);

      &:hover { color: var(--gray-700); }
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

    .alert-danger {
      padding: var(--spacing-md);
      background: var(--danger-light);
      color: var(--danger);
      border-radius: var(--radius-md);
      margin-top: var(--spacing-md);
    }

    .error-text {
      color: var(--danger);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
      display: block;
    }

    .help-text {
      color: var(--gray-500);
      font-size: 0.875rem;
      margin-top: var(--spacing-xs);
      display: block;
    }

    .form-control.is-invalid {
      border-color: var(--danger);

      &:focus {
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
      }
    }
  `],
})
export class AccountsListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ApiService);

  accounts = signal<Account[]>([]);
  loading = signal(true);
  saving = signal(false);
  searchTerm = '';
  filterType = '';
  showCreateModal = false;
  editingAccount: Account | null = null;
  saveError = '';

  newAccount = {
    code: '',
    name: '',
    type: '',
    parentCode: '',
    description: '',
  };

  // Form validation errors
  formErrors = {
    code: '',
    name: '',
    type: '',
  };

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.showCreateModal) {
      this.closeModal();
    }
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading.set(true);

    const params: Record<string, string> = {};
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.filterType) params['type'] = this.filterType;

    this.api.get<Account[]>('/accounts', params).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
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
    this.editingAccount = account;
    this.newAccount = {
      code: account.code,
      name: account.name,
      type: account.type,
      parentCode: '',
      description: '',
    };
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.editingAccount = null;
    this.saveError = '';
    this.newAccount = { code: '', name: '', type: '', parentCode: '', description: '' };
    this.formErrors = { code: '', name: '', type: '' };
  }

  validateForm(): boolean {
    let isValid = true;
    this.formErrors = { code: '', name: '', type: '' };

    if (!this.newAccount.code) {
      this.formErrors.code = 'Account code is required';
      isValid = false;
    } else if (!/^\d{2,}$/.test(this.newAccount.code)) {
      this.formErrors.code = 'Code must be numeric (e.g., 1000)';
      isValid = false;
    }

    if (!this.newAccount.name) {
      this.formErrors.name = 'Account name is required';
      isValid = false;
    } else if (this.newAccount.name.length < 2) {
      this.formErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (!this.newAccount.type) {
      this.formErrors.type = 'Account type is required';
      isValid = false;
    }

    return isValid;
  }

  saveAccount(): void {
    if (!this.validateForm()) {
      return;
    }

    this.saving.set(true);
    this.saveError = '';

    // Build payload, only include parentCode if it has a value
    const payload: Record<string, unknown> = {
      code: this.newAccount.code,
      name: this.newAccount.name,
      type: this.newAccount.type,
    };

    if (this.newAccount.parentCode && this.newAccount.parentCode.trim() !== '') {
      payload['parentCode'] = this.newAccount.parentCode;
    }

    if (this.newAccount.description && this.newAccount.description.trim() !== '') {
      payload['description'] = this.newAccount.description;
    }

    const request = this.editingAccount
      ? this.api.put(`/accounts/${this.editingAccount.id}`, payload)
      : this.api.post('/accounts', payload);

    request.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadAccounts();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError = err.error?.message || 'Error saving account';
      },
    });
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
