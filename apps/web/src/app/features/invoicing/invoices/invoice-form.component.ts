import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { BreadcrumbsComponent } from '@shared/components/breadcrumbs/breadcrumbs.component';

interface Contact {
  id: string;
  name: string;
  taxId: string;
}

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbsComponent],
  template: `
    <div class="page">
      <app-breadcrumbs [items]="[
        { label: 'Invoicing', link: '/invoicing', icon: '🧾' },
        { label: 'Invoices', link: '/invoicing/invoices' },
        { label: 'New Invoice' }
      ]" />

      <header class="page-header">
        <h1>New Sales Invoice</h1>
      </header>

      <!-- OCR Upload Section -->
      <div class="card mb-lg ocr-section">
        <div class="card-header">
          <h3>📄 Auto-fill with OCR</h3>
        </div>
        <div class="card-body">
          <div class="ocr-upload">
            <input
              type="file"
              #fileInput
              (change)="onFileSelected($event)"
              accept="image/*,application/pdf"
              style="display: none;" />

            @if (!selectedFile()) {
              <div class="upload-prompt" (click)="fileInput.click()">
                <span class="upload-icon">📁</span>
                <p class="upload-text">Click to select invoice (image or PDF)</p>
                <small class="upload-hint">OCR will automatically extract the data</small>
              </div>
            } @else {
              <div class="file-selected">
                <div class="file-info">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ selectedFile()?.name }}</span>
                  <button
                    type="button"
                    class="btn btn-sm btn-danger"
                    (click)="removeFile()">
                    × Remove
                  </button>
                </div>

                @if (!ocrProcessing()) {
                  <button
                    type="button"
                    class="btn btn-primary"
                    (click)="extractInvoiceData()">
                    🔍 Extract Data with OCR
                  </button>
                }

                @if (ocrProcessing()) {
                  <div class="ocr-loading">
                    <span class="spinner"></span>
                    <span>Processing invoice with OCR...</span>
                  </div>
                }

                @if (ocrConfidence()) {
                  <div
                    class="confidence-badge"
                    [class.high]="ocrConfidence()! > 0.8"
                    [class.medium]="ocrConfidence()! > 0.6 && ocrConfidence()! <= 0.8"
                    [class.low]="ocrConfidence()! <= 0.6">
                    Confidence: {{ ocrConfidence()! * 100 | number:'1.0-0' }}%
                  </div>
                }

                @if (ocrError()) {
                  <div class="error-message">
                    ❌ {{ ocrError() }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="card mb-lg">
          <div class="card-body">
            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Customer *</label>
                <select class="form-select" formControlName="contactId">
                  <option value="">Select customer</option>
                  @for (contact of contacts(); track contact.id) {
                    <option [value]="contact.id">{{ contact.name }} ({{ contact.taxId || 'No Tax ID' }})</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Date *</label>
                <input type="date" class="form-input" formControlName="date" />
              </div>
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" class="form-input" formControlName="dueDate" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea class="form-textarea" formControlName="notes" rows="2" placeholder="Notes or comments"></textarea>
            </div>
          </div>
        </div>

        <!-- Lines -->
        <div class="card mb-lg">
          <div class="card-header d-flex justify-between align-center">
            <h3>Invoice Lines</h3>
            <button type="button" class="btn btn-sm btn-secondary" (click)="addLine()">
              + Add Line
            </button>
          </div>
          <div class="card-body" style="padding: 0;">
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="width: 100px;">Quantity</th>
                  <th style="width: 120px;">Price</th>
                  <th style="width: 80px;">VAT %</th>
                  <th style="width: 120px;">Total</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody formArrayName="lines">
                @for (line of linesArray.controls; track line; let i = $index) {
                  <tr [formGroupName]="i">
                    <td>
                      <input type="text" class="form-input" formControlName="description" placeholder="Description" />
                    </td>
                    <td>
                      <input type="number" class="form-input text-right" formControlName="quantity" min="0" step="0.01" />
                    </td>
                    <td>
                      <input type="number" class="form-input text-right" formControlName="unitPrice" min="0" step="0.01" />
                    </td>
                    <td>
                      <select class="form-select" formControlName="vatRate">
                        <option [value]="21">21%</option>
                        <option [value]="10">10%</option>
                        <option [value]="4">4%</option>
                        <option [value]="0">0%</option>
                      </select>
                    </td>
                    <td class="text-right">
                      <strong>{{ getLineTotal(i) | number:'1.2-2' }} €</strong>
                    </td>
                    <td>
                      @if (linesArray.length > 1) {
                        <button type="button" class="btn btn-sm btn-danger" (click)="removeLine(i)">×</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals -->
        <div class="totals-card card mb-lg">
          <div class="card-body">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>{{ subtotal() | number:'1.2-2' }} €</span>
            </div>
            <div class="totals-row">
              <span>VAT:</span>
              <span>{{ vatAmount() | number:'1.2-2' }} €</span>
            </div>
            <div class="totals-row total">
              <span>TOTAL:</span>
              <span>{{ total() | number:'1.2-2' }} €</span>
            </div>
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-danger mb-lg">{{ error() }}</div>
        }

        <div class="d-flex gap-md justify-between">
          <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
          <div class="d-flex gap-md">
            <button type="submit" class="btn btn-secondary" [disabled]="saving()">
              Save Draft
            </button>
            <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="saveAndIssue()">
              Save and Issue
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
      max-width: 1000px;
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);
    }

    .form-row .form-group {
      flex: 1;
    }

    .totals-card {
      max-width: 300px;
      margin-left: auto;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-sm) 0;

      &.total {
        font-size: 1.25rem;
        font-weight: 600;
        border-top: 2px solid var(--gray-200);
        margin-top: var(--spacing-sm);
        padding-top: var(--spacing-md);
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

    /* OCR Styles */
    .ocr-section {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px dashed #0ea5e9;
    }

    .ocr-upload {
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .upload-prompt {
      text-align: center;
      cursor: pointer;
      padding: var(--spacing-lg);
      transition: all var(--transition-fast);

      &:hover {
        transform: scale(1.05);
      }

      .upload-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: var(--spacing-sm);
      }

      .upload-text {
        font-weight: 600;
        color: var(--gray-700);
        margin: 0 0 var(--spacing-xs);
      }

      .upload-hint {
        color: var(--gray-500);
        font-size: 0.875rem;
      }
    }

    .file-selected {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--white);
      border-radius: var(--radius-md);

      .file-icon {
        font-size: 1.5rem;
      }

      .file-name {
        flex: 1;
        font-weight: 500;
        color: var(--gray-700);
      }
    }

    .ocr-loading {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--white);
      border-radius: var(--radius-md);
      color: var(--gray-600);
    }

    .confidence-badge {
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--radius-md);
      font-weight: 600;
      text-align: center;

      &.high {
        background: #d1fae5;
        color: #065f46;
      }

      &.medium {
        background: #fef3c7;
        color: #92400e;
      }

      &.low {
        background: #fee2e2;
        color: #991b1b;
      }
    }

    .error-message {
      padding: var(--spacing-md);
      background: #fee2e2;
      color: #991b1b;
      border-radius: var(--radius-md);
      font-weight: 500;
    }
  `],
})
export class InvoiceFormComponent implements OnInit {
  form: FormGroup;
  contacts = signal<Contact[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);
  private issueAfterSave = false;

  // OCR signals
  selectedFile = signal<File | null>(null);
  ocrProcessing = signal(false);
  ocrError = signal<string | null>(null);
  ocrConfidence = signal<number | null>(null);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      contactId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      dueDate: [''],
      notes: [''],
      lines: this.fb.array([]),
    });

    this.addLine();
  }

  ngOnInit(): void {
    this.loadContacts();
  }

  get linesArray(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  loadContacts(): void {
    this.api.get<{ contacts: Contact[] }>('/contacts', { type: 'CUSTOMER' }).subscribe({
      next: (response) => this.contacts.set(response.contacts || []),
    });
  }

  addLine(): void {
    this.linesArray.push(
      this.fb.group({
        description: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(0)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        vatRate: [21],
      })
    );
  }

  removeLine(index: number): void {
    this.linesArray.removeAt(index);
  }

  getLineTotal(index: number): number {
    const line = this.linesArray.at(index);
    const qty = line.get('quantity')?.value || 0;
    const price = line.get('unitPrice')?.value || 0;
    const vat = line.get('vatRate')?.value || 0;
    const subtotal = qty * price;
    return subtotal + (subtotal * vat / 100);
  }

  subtotal(): number {
    return this.linesArray.controls.reduce((sum, line) => {
      const qty = line.get('quantity')?.value || 0;
      const price = line.get('unitPrice')?.value || 0;
      return sum + (qty * price);
    }, 0);
  }

  vatAmount(): number {
    return this.linesArray.controls.reduce((sum, line) => {
      const qty = line.get('quantity')?.value || 0;
      const price = line.get('unitPrice')?.value || 0;
      const vat = line.get('vatRate')?.value || 0;
      return sum + ((qty * price) * vat / 100);
    }, 0);
  }

  total(): number {
    return this.subtotal() + this.vatAmount();
  }

  cancel(): void {
    this.router.navigate(['/invoicing/invoices']);
  }

  saveAndIssue(): void {
    this.issueAfterSave = true;
    this.onSubmit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api.post<{ id: string }>('/invoices/sales', this.form.value).subscribe({
      next: (response) => {
        if (this.issueAfterSave) {
          this.api.patch(`/invoices/${response.id}/issue`, {}).subscribe({
            next: () => this.router.navigate(['/invoicing/invoices']),
            error: (err) => {
              this.saving.set(false);
              this.error.set(err.error?.message || 'Error issuing invoice');
            },
          });
        } else {
          this.router.navigate(['/invoicing/invoices']);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.issueAfterSave = false;
        this.error.set(err.error?.message || 'Error saving invoice');
      },
    });
  }

  // OCR Methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile.set(input.files[0]);
      this.ocrError.set(null);
      this.ocrConfidence.set(null);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.ocrError.set(null);
    this.ocrConfidence.set(null);
  }

  extractInvoiceData(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.ocrProcessing.set(true);
    this.ocrError.set(null);

    const formData = new FormData();
    formData.append('file', file);

    this.api.post<{
      success: boolean;
      data: {
        issuerName: string | null;
        issuerTaxId: string | null;
        invoiceNumber: string | null;
        invoiceDate: string | null;
        dueDate: string | null;
        subtotal: number | null;
        taxRate: number | null;
        taxAmount: number | null;
        total: number | null;
        currency: string;
        lineItems: Array<{
          description: string;
          quantity: number | null;
          unitPrice: number | null;
          amount: number | null;
        }>;
        confidence: number;
        provider: string;
      } | null;
      error?: string;
    }>('/ai/ocr/extract-invoice', formData).subscribe({
      next: (result) => {
        if (result.success && result.data) {
          this.populateFormFromOcr(result.data);
          this.ocrConfidence.set(result.data.confidence);
        } else {
          this.ocrError.set(result.error || 'Could not extract the data');
        }
        this.ocrProcessing.set(false);
      },
      error: (err) => {
        this.ocrError.set(err.error?.message || 'Error processing invoice');
        this.ocrProcessing.set(false);
      },
    });
  }

  private populateFormFromOcr(data: any): void {
    // Populate invoice date
    if (data.invoiceDate) {
      this.form.patchValue({ date: data.invoiceDate });
    }

    // Populate due date
    if (data.dueDate) {
      this.form.patchValue({ dueDate: data.dueDate });
    }

    // Find or create contact if issuer data exists
    if (data.issuerName && data.issuerTaxId) {
      const existingContact = this.contacts().find(c => c.taxId === data.issuerTaxId);
      if (existingContact) {
        this.form.patchValue({ contactId: existingContact.id });
      }
      // Note: Auto-creating contact would require additional API call
    }

    // Populate line items
    if (data.lineItems && data.lineItems.length > 0) {
      // Clear existing lines
      while (this.linesArray.length > 0) {
        this.linesArray.removeAt(0);
      }

      // Add OCR-extracted lines
      data.lineItems.forEach((item: any) => {
        this.linesArray.push(
          this.fb.group({
            description: [item.description || '', Validators.required],
            quantity: [item.quantity || 1, [Validators.required, Validators.min(0)]],
            unitPrice: [item.unitPrice || 0, [Validators.required, Validators.min(0)]],
            vatRate: [data.taxRate || 21],
          })
        );
      });
    }
  }
}
