import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';

interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
}

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>New Crypto Transaction</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="card mb-lg">
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Transaction Type *</label>
                <select class="form-select" formControlName="type">
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="SWAP">Swap</option>
                  <option value="TRANSFER_IN">Transfer In</option>
                  <option value="TRANSFER_OUT">Transfer Out</option>
                  <option value="STAKING_REWARD">Staking Reward</option>
                  <option value="AIRDROP">Airdrop</option>
                  <option value="MINING">Mining</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Asset *</label>
                <select class="form-select" formControlName="assetId">
                  <option value="">Select asset</option>
                  @for (asset of assets(); track asset.id) {
                    <option [value]="asset.id">{{ asset.symbol }} - {{ asset.name }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Date and Time *</label>
                <input type="datetime-local" class="form-input" formControlName="date" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Amount *</label>
                <input type="number" class="form-input" formControlName="amount" step="0.00000001" min="0" placeholder="0.00000000" />
              </div>
              <div class="form-group">
                <label class="form-label">Price per Unit (€)</label>
                <input type="number" class="form-input" formControlName="pricePerUnit" step="0.01" min="0" placeholder="0.00" />
              </div>
              <div class="form-group">
                <label class="form-label">Total Value (€)</label>
                <input type="number" class="form-input" formControlName="fiatValue" step="0.01" min="0" placeholder="Auto-calculated" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Exchange/Wallet</label>
                <input type="text" class="form-input" formControlName="exchange" placeholder="E.g.: Binance, Coinbase, MetaMask" />
              </div>
              <div class="form-group">
                <label class="form-label">Transaction Hash</label>
                <input type="text" class="form-input" formControlName="txHash" placeholder="0x..." />
              </div>
              <div class="form-group">
                <label class="form-label">Fee (in crypto)</label>
                <input type="number" class="form-input" formControlName="fee" step="0.00000001" min="0" placeholder="0.00000000" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea class="form-textarea" formControlName="notes" rows="2" placeholder="Additional notes"></textarea>
            </div>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-danger mb-lg">{{ error() }}</div>
        }

        <div class="d-flex gap-md justify-between">
          <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) {
              <span class="spinner"></span>
              Saving...
            } @else {
              Save Transaction
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
      max-width: 900px;
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);

      .form-group {
        flex: 1;
      }
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);

      &-danger {
        background: #fee2e2;
        color: #991b1b;
      }
    }
  `],
})
export class TransactionFormComponent implements OnInit {
  form: FormGroup;
  assets = signal<CryptoAsset[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
  ) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    this.form = this.fb.group({
      type: ['BUY', Validators.required],
      assetId: ['', Validators.required],
      date: [now.toISOString().slice(0, 16), Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      pricePerUnit: [null],
      fiatValue: [null],
      exchange: [''],
      txHash: [''],
      fee: [null],
      notes: [''],
    });

    // Auto-calculate fiat value
    this.form.get('amount')?.valueChanges.subscribe(() => this.calculateFiatValue());
    this.form.get('pricePerUnit')?.valueChanges.subscribe(() => this.calculateFiatValue());
  }

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    this.api.get<CryptoAsset[]>('/crypto/assets').subscribe({
      next: (assets) => this.assets.set(assets),
    });
  }

  calculateFiatValue(): void {
    const amount = this.form.get('amount')?.value;
    const price = this.form.get('pricePerUnit')?.value;
    if (amount && price) {
      this.form.patchValue({ fiatValue: amount * price }, { emitEvent: false });
    }
  }

  cancel(): void {
    this.router.navigate(['/crypto/transactions']);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const data = { ...this.form.value };
    data.date = new Date(data.date).toISOString();

    this.api.post('/crypto/transactions', data).subscribe({
      next: () => {
        this.router.navigate(['/crypto/transactions']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || 'Error saving transaction');
      },
    });
  }
}
