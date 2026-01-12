import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/services/api.service';
import { DialogService } from '@core/services/dialog.service';
import { NotificationService } from '@core/services/notification.service';

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
          <h1>Fiscal Years</h1>
          <p class="text-muted">Manage accounting periods</p>
        </div>
        <button class="btn btn-primary" (click)="showCreateForm = true">
          + New Fiscal Year
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
                  <th>Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                        {{ year.isClosed ? 'Closed' : 'Open' }}
                      </span>
                    </td>
                    <td>
                      @if (!year.isClosed) {
                        <button class="btn btn-sm btn-secondary" (click)="closeYear(year)">
                          Close Year
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-secondary" (click)="reopenYear(year)">
                          Reopen
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="text-center text-muted p-lg">
                      No fiscal years configured
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

  private dialogService = inject(DialogService);
  private notificationService = inject(NotificationService);

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

  async closeYear(year: FiscalYear): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Close Fiscal Year',
      message: `Are you sure you want to close fiscal year "${year.name}"? This will prevent further entries.`,
      confirmText: 'Close Year',
      cancelText: 'Cancel',
      confirmColor: 'warning',
    });

    if (confirmed) {
      this.api.patch(`/fiscal-years/${year.id}/close`, {}).subscribe({
        next: () => {
          this.notificationService.success(`Fiscal year "${year.name}" closed successfully`);
          this.loadFiscalYears();
        },
      });
    }
  }

  async reopenYear(year: FiscalYear): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Reopen Fiscal Year',
      message: `Are you sure you want to reopen fiscal year "${year.name}"?`,
      confirmText: 'Reopen',
      cancelText: 'Cancel',
      confirmColor: 'primary',
    });

    if (confirmed) {
      this.api.patch(`/fiscal-years/${year.id}/reopen`, {}).subscribe({
        next: () => {
          this.notificationService.success(`Fiscal year "${year.name}" reopened successfully`);
          this.loadFiscalYears();
        },
      });
    }
  }
}
