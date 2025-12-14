import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Contactos</h1>
          <p class="text-muted">Gestiona clientes y proveedores</p>
        </div>
        <button class="btn btn-primary" (click)="showModal = true">
          + Nuevo Contacto
        </button>
      </header>

      <!-- Filters -->
      <div class="filters card">
        <div class="card-body d-flex gap-md">
          <input
            type="text"
            class="form-input"
            placeholder="Buscar..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearch()"
            style="max-width: 250px;"
          />
          <select class="form-select" [(ngModel)]="filterType" (ngModelChange)="loadContacts()" style="max-width: 150px;">
            <option value="">Todos</option>
            <option value="CUSTOMER">Clientes</option>
            <option value="SUPPLIER">Proveedores</option>
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
                  <th>Nombre</th>
                  <th>NIF/CIF</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th>Acciones</th>
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
                        {{ contact.type === 'CUSTOMER' ? 'Cliente' : 'Proveedor' }}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-sm btn-secondary" (click)="editContact(contact)">Editar</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted p-lg">
                      No se encontraron contactos
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
              <h3>Nuevo Contacto</h3>
              <button class="close-btn" (click)="showModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" class="form-input" [(ngModel)]="newContact.name" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">NIF/CIF</label>
                  <input type="text" class="form-input" [(ngModel)]="newContact.taxId" />
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo</label>
                  <select class="form-select" [(ngModel)]="newContact.type">
                    <option value="CUSTOMER">Cliente</option>
                    <option value="SUPPLIER">Proveedor</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" [(ngModel)]="newContact.email" />
                </div>
                <div class="form-group">
                  <label class="form-label">Teléfono</label>
                  <input type="text" class="form-input" [(ngModel)]="newContact.phone" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showModal = false">Cancelar</button>
              <button class="btn btn-primary" (click)="createContact()">Crear</button>
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
  `],
})
export class ContactsListComponent implements OnInit {
  contacts = signal<Contact[]>([]);
  loading = signal(true);
  searchTerm = '';
  filterType = '';
  showModal = false;

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
    console.log('Edit:', contact);
  }

  createContact(): void {
    this.api.post('/contacts', this.newContact).subscribe({
      next: () => {
        this.showModal = false;
        this.newContact = { name: '', taxId: '', email: '', phone: '', type: 'CUSTOMER' };
        this.loadContacts();
      },
    });
  }
}
