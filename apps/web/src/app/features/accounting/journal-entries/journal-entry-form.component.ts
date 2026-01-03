import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';

interface Account {
  id: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-journal-entry-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>New Journal Entry</h1>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="card mb-lg">
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" formControlName="date" />
              </div>
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Description</label>
                <input type="text" class="form-input" formControlName="description" placeholder="Entry description" />
              </div>
              <div class="form-group">
                <label class="form-label">Reference</label>
                <input type="text" class="form-input" formControlName="reference" placeholder="Doc. reference" />
              </div>
            </div>
          </div>
        </div>

        <!-- Lines -->
        <div class="card mb-lg">
          <div class="card-header d-flex justify-between align-center">
            <h3>Entry Lines</h3>
            <button type="button" class="btn btn-sm btn-secondary" (click)="addLine()">
              + Add Line
            </button>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Description</th>
                  <th style="width: 150px;">Debit</th>
                  <th style="width: 150px;">Credit</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody formArrayName="lines">
                @for (line of linesArray.controls; track line; let i = $index) {
                  <tr [formGroupName]="i">
                    <td>
                      <select class="form-select" formControlName="accountCode">
                        <option value="">Select account</option>
                        @for (account of accounts(); track account.id) {
                          <option [value]="account.code">{{ account.code }} - {{ account.name }}</option>
                        }
                      </select>
                    </td>
                    <td>
                      <input type="text" class="form-input" formControlName="description" placeholder="Description" />
                    </td>
                    <td>
                      <input type="number" class="form-input text-right" formControlName="debit" step="0.01" min="0" />
                    </td>
                    <td>
                      <input type="number" class="form-input text-right" formControlName="credit" step="0.01" min="0" />
                    </td>
                    <td>
                      @if (linesArray.length > 2) {
                        <button type="button" class="btn btn-sm btn-danger" (click)="removeLine(i)">×</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="text-right"><strong>Totals:</strong></td>
                  <td class="text-right"><strong>{{ totalDebit() | number:'1.2-2' }}</strong></td>
                  <td class="text-right"><strong>{{ totalCredit() | number:'1.2-2' }}</strong></td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="2" class="text-right">Difference:</td>
                  <td colspan="2" class="text-center" [class.text-danger]="!isBalanced()" [class.text-success]="isBalanced()">
                    <strong>{{ difference() | number:'1.2-2' }}</strong>
                    @if (isBalanced()) {
                      ✓ Balanced
                    } @else {
                      ⚠ Unbalanced
                    }
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-danger mb-lg">{{ error() }}</div>
        }

        <div class="d-flex gap-md justify-between">
          <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
          <div class="d-flex gap-md">
            <button type="submit" class="btn btn-secondary" [disabled]="saving() || !isBalanced()">
              Save Draft
            </button>
            <button type="button" class="btn btn-primary" [disabled]="saving() || !isBalanced()" (click)="saveAndPost()">
              Save and Post
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
      max-width: 1200px;
    }

    .page-header {
      margin-bottom: var(--spacing-lg);
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);
    }

    .form-row .form-group {
      flex: 1;
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);

      &-danger {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
    }
  `],
})
export class JournalEntryFormComponent implements OnInit {
  form: FormGroup;
  accounts = signal<Account[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);
  private postAfterSave = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
      reference: [''],
      lines: this.fb.array([]),
    });

    // Add initial lines
    this.addLine();
    this.addLine();
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  get linesArray(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  loadAccounts(): void {
    this.api.get<Account[]>('/accounts', { isActive: true }).subscribe({
      next: (accounts) => this.accounts.set(accounts),
    });
  }

  addLine(): void {
    this.linesArray.push(
      this.fb.group({
        accountCode: ['', Validators.required],
        description: [''],
        debit: [0],
        credit: [0],
      })
    );
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
  }

  totalDebit(): number {
    return this.linesArray.controls.reduce((sum, line) => sum + (line.get('debit')?.value || 0), 0);
  }

  totalCredit(): number {
    return this.linesArray.controls.reduce((sum, line) => sum + (line.get('credit')?.value || 0), 0);
  }

  difference(): number {
    return Math.abs(this.totalDebit() - this.totalCredit());
  }

  isBalanced(): boolean {
    return this.difference() < 0.01 && this.totalDebit() > 0;
  }

  cancel(): void {
    this.router.navigate(['/accounting/journal-entries']);
  }

  saveAndPost(): void {
    this.postAfterSave = true;
    this.onSubmit();
  }

  onSubmit(): void {
    if (!this.isBalanced()) {
      this.error.set('Entry must be balanced');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api.post<{ id: string }>('/journal-entries', this.form.value).subscribe({
      next: (response) => {
        if (this.postAfterSave) {
          this.api.patch(`/journal-entries/${response.id}/post`, {}).subscribe({
            next: () => this.router.navigate(['/accounting/journal-entries']),
            error: (err) => {
              this.saving.set(false);
              this.error.set(err.error?.message || 'Error posting entry');
            },
          });
        } else {
          this.router.navigate(['/accounting/journal-entries']);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.postAfterSave = false;
        this.error.set(err.error?.message || 'Error saving entry');
      },
    });
  }
}
