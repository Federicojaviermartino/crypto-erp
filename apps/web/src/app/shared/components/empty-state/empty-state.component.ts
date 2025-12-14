import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-description">{{ description }}</p>

      <div class="empty-action" *ngIf="actionText || actionLink">
        <button
          *ngIf="actionText && !actionLink"
          class="btn btn-primary"
          (click)="onAction()"
        >
          {{ actionText }}
        </button>

        <a
          *ngIf="actionText && actionLink"
          [routerLink]="actionLink"
          class="btn btn-primary"
        >
          {{ actionText }}
        </a>
      </div>

      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-2xl);
      text-align: center;
      min-height: 300px;

      .empty-icon {
        font-size: 4rem;
        margin-bottom: var(--spacing-lg);
        opacity: 0.5;
      }

      .empty-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 var(--spacing-sm) 0;
        color: var(--gray-700);
      }

      .empty-description {
        color: var(--gray-500);
        margin: 0 0 var(--spacing-lg) 0;
        max-width: 400px;
        line-height: 1.6;
      }

      .empty-action {
        margin-top: var(--spacing-md);
      }
    }

    @media (max-width: 768px) {
      .empty-state {
        padding: var(--spacing-xl);
        min-height: 200px;

        .empty-icon {
          font-size: 3rem;
        }

        .empty-title {
          font-size: 1.125rem;
        }

        .empty-description {
          font-size: 0.875rem;
        }
      }
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon = '📋';
  @Input() title = 'No hay datos';
  @Input() description = 'No se encontraron resultados para mostrar';
  @Input() actionText?: string;
  @Input() actionLink?: string;

  @Output() action = new EventEmitter<void>();

  onAction(): void {
    this.action.emit();
  }
}
