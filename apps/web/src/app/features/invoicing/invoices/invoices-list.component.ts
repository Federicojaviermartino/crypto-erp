import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  direction: string;
  status: string;
  totalAmount: number;
  verifactuHash: string | null;
  contact: {
    name: string;
  };
}

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Invoices</h1>
          <p class="text-muted">Manage your sales and purchase invoices</p>
        </div>
        <div class="d-flex gap-md">
          <a routerLink="/invoicing/contacts" class="btn btn-secondary">Contacts</a>
          <a routerLink="/invoicing/invoices/new" class="btn btn-primary">+ New Invoice</a>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs mb-lg">
        <button
          class="tab"
          [class.active]="direction === 'SALES'"
          (click)="direction = 'SALES'; loadInvoices()"
        >
          Sales
        </button>
        <button
          class="tab"
          [class.active]="direction === 'PURCHASE'"
          (click)="direction = 'PURCHASE'; loadInvoices()"
        >
          Purchases
        </button>
      </div>

      <!-- Filters -->
      <div class="filters card">
        <div class="card-body d-flex gap-md">
          <input
            type="text"
            class="form-input"
            placeholder="Search..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
            style="max-width: 250px;"
          />
          <select class="form-select" [(ngModel)]="filterStatus" (ngModelChange)="loadInvoices()" style="max-width: 150px;">
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Invoices Table -->
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
                  <th>Number</th>
                  <th>Date</th>
                  <th>{{ direction === 'SALES' ? 'Customer' : 'Supplier' }}</th>
                  <th class="text-right">Amount</th>
                  <th>Status</th>
                  <th class="verifactu-header">
                    <span class="header-with-tooltip">
                      VeriFactu
                      <span class="help-icon" data-tooltip="Spanish Invoice Verification System (VeriFactu) from AEAT. Indicates if the invoice complies with Spanish electronic invoicing regulations.">?</span>
                    </span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (invoice of invoices(); track invoice.id) {
                  <tr>
                    <td><strong>{{ invoice.invoiceNumber }}</strong></td>
                    <td>{{ invoice.date | date:'dd/MM/yyyy' }}</td>
                    <td>{{ invoice.contact?.name }}</td>
                    <td class="text-right">{{ invoice.totalAmount | number:'1.2-2' }} €</td>
                    <td>
                      <span class="badge" [class]="getStatusBadgeClass(invoice.status)">
                        {{ getStatusLabel(invoice.status) }}
                      </span>
                    </td>
                    <td>
                      @if (invoice.verifactuHash) {
                        <span class="badge badge-success" title="Registered in Verifactu">✓</span>
                      } @else {
                        <span class="badge badge-secondary">-</span>
                      }
                    </td>
                    <td>
                      <div class="d-flex gap-sm">
                        <button class="btn btn-sm btn-secondary">View</button>
                        @if (invoice.status === 'DRAFT') {
                          <button class="btn btn-sm btn-primary" (click)="issueInvoice(invoice)">Issue</button>
                        }
                        @if (invoice.status === 'ISSUED') {
                          <button class="btn btn-sm btn-success" (click)="markAsPaid(invoice)">Mark Paid</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted p-lg">
                      No invoices found
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
    }

    .tabs {
      display: flex;
      gap: var(--spacing-sm);
      border-bottom: 2px solid var(--gray-200);
      padding-bottom: var(--spacing-sm);
    }

    .tab {
      padding: var(--spacing-sm) var(--spacing-lg);
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 500;
      color: var(--gray-500);
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

    .filters {
      margin-bottom: var(--spacing-lg);
    }

    .header-with-tooltip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .help-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--gray-300);
      color: var(--gray-600);
      font-size: 11px;
      font-weight: 600;
      cursor: help;
      position: relative;
      transition: all 0.2s ease;

      &:hover {
        background: var(--primary);
        color: var(--white);
      }

      &:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 8px;
        padding: 8px 12px;
        background: var(--gray-900);
        color: var(--white);
        font-size: 12px;
        font-weight: 400;
        white-space: normal;
        width: 250px;
        border-radius: var(--radius-md);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 100;
        line-height: 1.4;
      }

      &:hover::before {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 4px;
        border: 4px solid transparent;
        border-bottom-color: var(--gray-900);
        z-index: 100;
      }
    }
  `],
})
export class InvoicesListComponent implements OnInit {
  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  searchTerm = '';
  filterStatus = '';
  direction = 'SALES';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading.set(true);

    const params: Record<string, string> = { direction: this.direction };
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.filterStatus) params['status'] = this.filterStatus;

    this.api.get<{ invoices: Invoice[] }>('/invoices', params).subscribe({
      next: (response) => {
        this.invoices.set(response.invoices || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    setTimeout(() => this.loadInvoices(), 300);
  }

  issueInvoice(invoice: Invoice): void {
    this.api.patch(`/invoices/${invoice.id}/issue`, {}).subscribe({
      next: () => this.loadInvoices(),
    });
  }

  markAsPaid(invoice: Invoice): void {
    this.api.patch(`/invoices/${invoice.id}/paid`, {}).subscribe({
      next: () => this.loadInvoices(),
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      DRAFT: 'badge-warning',
      ISSUED: 'badge-info',
      SENT: 'badge-info',
      PAID: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Draft',
      ISSUED: 'Issued',
      SENT: 'Sent',
      PAID: 'Paid',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  }
}
