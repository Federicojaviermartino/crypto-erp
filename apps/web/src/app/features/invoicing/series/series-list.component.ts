import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/services/api.service';

interface InvoiceSeries {
  id: string;
  prefix: string;
  name: string;
  nextNumber: number;
  isDefault: boolean;
  isSales: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-series-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Invoice Series</h1>
          <p class="text-muted">Configure numbering series</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateModal = true">
          + New Series
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
                  <th>Prefix</th>
                  <th>Name</th>
                  <th>Next No.</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (series of seriesList(); track series.id) {
                  <tr>
                    <td><strong>{{ series.prefix }}</strong></td>
                    <td>{{ series.name }}</td>
                    <td>{{ series.nextNumber }}</td>
                    <td>
                      <span class="badge" [class]="series.isSales ? 'badge-info' : 'badge-warning'">
                        {{ series.isSales ? 'Sales' : 'Purchases' }}
                      </span>
                    </td>
                    <td>
                      @if (series.isDefault) {
                        <span class="badge badge-success">✓ Yes</span>
                      } @else {
                        <span class="text-muted">No</span>
                      }
                    </td>
                    <td>
                      <span class="badge" [class]="series.isActive ? 'badge-success' : 'badge-secondary'">
                        {{ series.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center text-muted p-lg">
                      No series configured
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
export class SeriesListComponent implements OnInit {
  seriesList = signal<InvoiceSeries[]>([]);
  loading = signal(true);
  showCreateModal = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadSeries();
  }

  loadSeries(): void {
    this.loading.set(true);
    this.api.get<InvoiceSeries[]>('/invoice-series').subscribe({
      next: (series) => {
        this.seriesList.set(series);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
