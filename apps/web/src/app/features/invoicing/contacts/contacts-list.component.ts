import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

interface Contact {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  isActive: boolean;
}

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Contacts</h1>
          <p class="text-muted">Manage customers and suppliers</p>
        </div>
        <button class="btn btn-primary" (click)="showModal = true">
          + New Contact
        </button>
      </header>

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
          <select class="form-select" [(ngModel)]="filterType" (ngModelChange)="loadContacts()" style="max-width: 150px;">
            <option value="">All</option>
            <option value="CUSTOMER">Customers</option>
            <option value="SUPPLIER">Suppliers</option>
          </select>
        </div>
      </div>

      <!-- Contacts Table -->
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
                  <th>Name</th>
                  <th>Tax ID</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (contact of contacts(); track contact.id) {
                  <tr>
                    <td><strong>{{ contact.name }}</strong></td>
                    <td>{{ contact.taxId || '-' }}</td>
                    <td>{{ contact.email || '-' }}</td>
                    <td>{{ contact.phone || '-' }}</td>
                    <td>
                      <span class="badge" [class]="contact.type === 'CUSTOMER' ? 'badge-info' : 'badge-warning'">
                        {{ contact.type === 'CUSTOMER' ? 'Customer' : 'Supplier' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-secondary" (click)="editContact(contact)">Edit</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">
                      <app-empty-state
                        icon="👥"
                        title="No contacts yet"
                        description="Add your first customer or supplier to start managing your contacts"
                        actionText="+ New Contact"
                        (action)="showModal = true"
                        [features]="['Manage customers & suppliers', 'Store contact details', 'Link to invoices']"
                        color="purple"
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

      <!-- Create Modal -->
      @if (showModal) {
        <div class="modal-backdrop" (click)="showModal = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingContact ? 'Edit Contact' : 'New Contact' }}</h3>
              <button class="close-btn" (click)="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Name *</label>
                <input type="text" class="form-input" [(ngModel)]="newContact.name" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tax ID</label>
                  <input type="text" class="form-input" [(ngModel)]="newContact.taxId" />
                </div>
                <div class="form-group">
                  <label class="form-label">Type</label>
                  <select class="form-select" [(ngModel)]="newContact.type">
                    <option value="CUSTOMER">Customer</option>
                    <option value="SUPPLIER">Supplier</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" [(ngModel)]="newContact.email" />
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-input" [(ngModel)]="newContact.phone" />
                </div>
              </div>
              @if (saveError) {
                <div class="alert alert-danger">{{ saveError }}</div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveContact()" [disabled]="!newContact.name || saving()">
                {{ saving() ? 'Saving...' : (editingContact ? 'Update' : 'Create') }}
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

    .filters {
      margin-bottom: var(--spacing-lg);
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);

      .form-group {
        flex: 1;
      }
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
      max-width: 500px;
      box-shadow: var(--shadow-lg);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg);
      border-bottom: 1px solid var(--gray-200);

      h3 { margin: 0; }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--gray-500);
      }
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

    .alert-danger {
      padding: var(--spacing-md);
      background: var(--danger-light);
      color: var(--danger);
      border-radius: var(--radius-md);
      margin-top: var(--spacing-md);
    }
  `],
})
export class ContactsListComponent implements OnInit {
  contacts = signal<Contact[]>([]);
  loading = signal(true);
  saving = signal(false);
  searchTerm = '';
  filterType = '';
  showModal = false;
  editingContact: Contact | null = null;
  saveError = '';

  newContact = {
    name: '',
    taxId: '',
    email: '',
    phone: '',
    type: 'CUSTOMER',
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.loading.set(true);

    const params: Record<string, string> = {};
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.filterType) params['type'] = this.filterType;

    this.api.get<{ contacts: Contact[] }>('/contacts', params).subscribe({
      next: (response) => {
        this.contacts.set(response.contacts || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    setTimeout(() => this.loadContacts(), 300);
  }

  editContact(contact: Contact): void {
    this.editingContact = contact;
    this.newContact = {
      name: contact.name,
      taxId: contact.taxId || '',
      email: contact.email || '',
      phone: contact.phone || '',
      type: contact.type,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingContact = null;
    this.saveError = '';
    this.newContact = { name: '', taxId: '', email: '', phone: '', type: 'CUSTOMER' };
  }

  saveContact(): void {
    if (!this.newContact.name) {
      return;
    }

    this.saving.set(true);
    this.saveError = '';

    const payload = {
      name: this.newContact.name,
      taxId: this.newContact.taxId || null,
      email: this.newContact.email || null,
      phone: this.newContact.phone || null,
      type: this.newContact.type,
    };

    const request = this.editingContact
      ? this.api.put(`/contacts/${this.editingContact.id}`, payload)
      : this.api.post('/contacts', payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadContacts();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError = err.error?.message || 'Error saving contact';
      },
    });
  }
}
