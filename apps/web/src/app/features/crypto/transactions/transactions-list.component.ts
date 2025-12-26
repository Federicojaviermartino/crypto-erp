import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface CryptoTransaction {
  id: string;
  type: string;
  date: string;
  amount: number;
  pricePerUnit: number | null;
  fiatValue: number | null;
  costBasis: number | null;
  realizedGainLoss: number | null;
  exchange: string | null;
  asset: {
    symbol: string;
    name: string;
  };
}

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Crypto Transactions</h1>
          <p class="text-muted">Transaction history</p>
        </div>
        <a routerLink="/crypto/transactions/new" class="btn btn-primary">+ New Transaction</a>
      </header>

      <!-- Filters -->
      <div class="filters card">
        <div class="card-body d-flex gap-md">
          <select class="form-select" [(ngModel)]="filterType" (ngModelChange)="loadTransactions()" style="max-width: 150px;">
            <option value="">All types</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="SWAP">Swap</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="STAKING_REWARD">Staking</option>
          </select>
          <input type="date" class="form-input" [(ngModel)]="startDate" (ngModelChange)="loadTransactions()" style="max-width: 150px;" />
          <input type="date" class="form-input" [(ngModel)]="endDate" (ngModelChange)="loadTransactions()" style="max-width: 150px;" />
        </div>
      </div>

      <!-- Transactions Table -->
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
                  <th>Date</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">Price</th>
                  <th class="text-right">Value</th>
                  <th class="text-right">Gain/Loss</th>
                  <th>Exchange</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of transactions(); track tx.id) {
                  <tr>
                    <td>{{ tx.date | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <span class="badge" [class]="getTypeBadgeClass(tx.type)">
                        {{ getTypeLabel(tx.type) }}
                      </span>
                    </td>
                    <td><strong>{{ tx.asset?.symbol }}</strong></td>
                    <td class="text-right">{{ tx.amount | number:'1.8-8' }}</td>
                    <td class="text-right">
                      @if (tx.pricePerUnit) {
                        {{ tx.pricePerUnit | number:'1.2-2' }} €
                      } @else {
                        -
                      }
                    </td>
                    <td class="text-right">
                      @if (tx.fiatValue) {
                        {{ tx.fiatValue | number:'1.2-2' }} €
                      } @else {
                        -
                      }
                    </td>
                    <td class="text-right" [class.text-success]="tx.realizedGainLoss && tx.realizedGainLoss > 0" [class.text-danger]="tx.realizedGainLoss && tx.realizedGainLoss < 0">
                      @if (tx.realizedGainLoss !== null) {
                        {{ tx.realizedGainLoss | number:'1.2-2' }} €
                      } @else {
                        -
                      }
                    </td>
                    <td>{{ tx.exchange || '-' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="text-center text-muted p-lg">
                      No transactions found
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

    .filters {
      margin-bottom: var(--spacing-lg);
    }
  `],
})
export class TransactionsListComponent implements OnInit {
  transactions = signal<CryptoTransaction[]>([]);
  loading = signal(true);
  filterType = '';
  startDate = '';
  endDate = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.loading.set(true);

    const params: Record<string, string> = {};
    if (this.filterType) params['type'] = this.filterType;
    if (this.startDate) params['startDate'] = this.startDate;
    if (this.endDate) params['endDate'] = this.endDate;

    this.api.get<{ transactions: CryptoTransaction[] }>('/crypto/transactions', params).subscribe({
      next: (response) => {
        this.transactions.set(response.transactions || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      BUY: 'badge-success',
      SELL: 'badge-danger',
      SWAP: 'badge-info',
      TRANSFER_IN: 'badge-success',
      TRANSFER_OUT: 'badge-warning',
      STAKING_REWARD: 'badge-info',
      AIRDROP: 'badge-info',
      MINING: 'badge-info',
    };
    return classes[type] || 'badge-secondary';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      BUY: 'Buy',
      SELL: 'Sell',
      SWAP: 'Swap',
      TRANSFER_IN: 'Transfer In',
      TRANSFER_OUT: 'Transfer Out',
      STAKING_REWARD: 'Staking',
      AIRDROP: 'Airdrop',
      MINING: 'Mining',
      FEE: 'Fee',
    };
    return labels[type] || type;
  }
}
