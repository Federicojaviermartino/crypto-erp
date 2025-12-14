import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/services/api.service';

interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
}

@Component({
  selector: 'app-fiscal-years-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Años Fiscales</h1>
          <p class="text-muted">Gestiona los ejercicios contables</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateForm = true">
          + Nuevo Año Fiscal
        </button>
      </header>

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
                  <th>Fecha Inicio</th>
                  <th>Fecha Fin</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (year of fiscalYears(); track year.id) {
                  <tr>
                    <td><strong>{{ year.name }}</strong></td>
                    <td>{{ year.startDate | date:'dd/MM/yyyy' }}</td>
                    <td>{{ year.endDate | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge" [class]="year.isClosed ? 'badge-secondary' : 'badge-success'">
                        {{ year.isClosed ? 'Cerrado' : 'Abierto' }}
                      </span>
                    </td>
                    <td>
                      @if (!year.isClosed) {
                        <button class="btn btn-sm btn-secondary" (click)="closeYear(year)">
                          Cerrar Año
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-secondary" (click)="reopenYear(year)">
                          Reabrir
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted p-lg">
                      No hay años fiscales configurados
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
  `],
})
export class FiscalYearsListComponent implements OnInit {
  fiscalYears = signal<FiscalYear[]>([]);
  loading = signal(true);
  showCreateForm = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadFiscalYears();
  }

  loadFiscalYears(): void {
    this.loading.set(true);
    this.api.get<FiscalYear[]>('/fiscal-years').subscribe({
      next: (years) => {
        this.fiscalYears.set(years);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  closeYear(year: FiscalYear): void {
    if (confirm(`¿Cerrar el año fiscal ${year.name}?`)) {
      this.api.patch(`/fiscal-years/${year.id}/close`, {}).subscribe({
        next: () => this.loadFiscalYears(),
      });
    }
  }

  reopenYear(year: FiscalYear): void {
    if (confirm(`¿Reabrir el año fiscal ${year.name}?`)) {
      this.api.patch(`/fiscal-years/${year.id}/reopen`, {}).subscribe({
        next: () => this.loadFiscalYears(),
      });
    }
  }
}
