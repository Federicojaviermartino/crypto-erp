import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  lines: { debit: number; credit: number }[];
}

@Component({
  selector: 'app-journal-entries-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Asientos Contables</h1>
          <p class="text-muted">Gestiona los asientos del libro diario</p>
        </div>
        <a routerLink="/accounting/journal-entries/new" class="btn btn-primary">
          + Nuevo Asiento
        </a>
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
          <select class="form-select" [(ngModel)]="filterStatus" (ngModelChange)="loadEntries()" style="max-width: 150px;">
            <option value="">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="POSTED">Publicado</option>
            <option value="VOIDED">Anulado</option>
          </select>
          <input
            type="date"
            class="form-input"
            [(ngModel)]="startDate"
            (ngModelChange)="loadEntries()"
            style="max-width: 150px;"
          />
          <input
            type="date"
            class="form-input"
            [(ngModel)]="endDate"
            (ngModelChange)="loadEntries()"
            style="max-width: 150px;"
          />
        </div>
      </div>

      <!-- Entries Table -->
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
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th class="text-right">Debe</th>
                  <th class="text-right">Haber</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track entry.id) {
                  <tr>
                    <td><strong>{{ entry.entryNumber }}</strong></td>
                    <td>{{ entry.date | date:'dd/MM/yyyy' }}</td>
                    <td>{{ entry.description || '-' }}</td>
                    <td class="text-right">{{ getTotalDebit(entry) | number:'1.2-2' }} €</td>
                    <td class="text-right">{{ getTotalCredit(entry) | number:'1.2-2' }} €</td>
                    <td>
                      <span class="badge" [class]="getStatusBadgeClass(entry.status)">
                        {{ getStatusLabel(entry.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="d-flex gap-sm">
                        <button class="btn btn-sm btn-secondary">Ver</button>
                        @if (entry.status === 'DRAFT') {
                          <button class="btn btn-sm btn-primary" (click)="postEntry(entry)">Publicar</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center text-muted p-lg">
                      No se encontraron asientos
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
export class JournalEntriesListComponent implements OnInit {
  entries = signal<JournalEntry[]>([]);
  loading = signal(true);
  searchTerm = '';
  filterStatus = '';
  startDate = '';
  endDate = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.loading.set(true);

    const params: Record<string, string> = {};
    if (this.searchTerm) params['search'] = this.searchTerm;
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.startDate) params['startDate'] = this.startDate;
    if (this.endDate) params['endDate'] = this.endDate;

    this.api.get<{ entries: JournalEntry[] }>('/journal-entries', params).subscribe({
      next: (response) => {
        this.entries.set(response.entries || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    setTimeout(() => this.loadEntries(), 300);
  }

  getTotalDebit(entry: JournalEntry): number {
    return entry.lines?.reduce((sum, line) => sum + (line.debit || 0), 0) || 0;
  }

  getTotalCredit(entry: JournalEntry): number {
    return entry.lines?.reduce((sum, line) => sum + (line.credit || 0), 0) || 0;
  }

  postEntry(entry: JournalEntry): void {
    this.api.patch(`/journal-entries/${entry.id}/post`, {}).subscribe({
      next: () => this.loadEntries(),
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      DRAFT: 'badge-warning',
      POSTED: 'badge-success',
      VOIDED: 'badge-danger',
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador',
      POSTED: 'Publicado',
      VOIDED: 'Anulado',
    };
    return labels[status] || status;
  }
}
