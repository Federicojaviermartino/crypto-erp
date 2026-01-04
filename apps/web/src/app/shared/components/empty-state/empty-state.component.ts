import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="empty-state" [class]="'empty-state--' + variant">
      <div class="empty-illustration" [class]="'illustration--' + color">
        <span class="empty-icon">{{ icon }}</span>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-description">{{ description }}</p>

      @if (features.length > 0) {
        <ul class="empty-features">
          @for (feature of features; track feature) {
            <li>{{ feature }}</li>
          }
        </ul>
      }

      <div class="empty-actions">
        @if (actionText && !actionLink) {
          <button class="btn btn-primary btn-lg" (click)="onAction()">
            {{ actionText }}
          </button>
        }

        @if (actionText && actionLink) {
          <a [routerLink]="actionLink" class="btn btn-primary btn-lg">
            {{ actionText }}
          </a>
        }

        @if (secondaryActionText) {
          <button class="btn btn-secondary" (click)="onSecondaryAction()">
            {{ secondaryActionText }}
          </button>
        }
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
      min-height: 350px;
    }

    .empty-illustration {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      margin-bottom: var(--spacing-xl);
      position: relative;

      &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        opacity: 0.1;
        background: currentColor;
      }

      &.illustration--blue {
        color: var(--primary);
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
      }

      &.illustration--green {
        color: var(--success);
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%);
      }

      &.illustration--purple {
        color: #8b5cf6;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
      }

      &.illustration--amber {
        color: var(--warning);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
      }

      &.illustration--gray {
        color: var(--gray-500);
        background: linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(100, 116, 139, 0.05) 100%);
      }
    }

    .empty-icon {
      font-size: 3.5rem;
      z-index: 1;
    }

    .empty-title {
      font-size: 1.375rem;
      font-weight: 600;
      margin: 0 0 var(--spacing-sm) 0;
      color: var(--gray-800);
    }

    .empty-description {
      color: var(--gray-500);
      margin: 0 0 var(--spacing-md) 0;
      max-width: 420px;
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    .empty-features {
      list-style: none;
      padding: 0;
      margin: 0 0 var(--spacing-lg) 0;
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-sm);
      justify-content: center;

      li {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--gray-100);
        border-radius: var(--radius-full);
        font-size: 0.8125rem;
        color: var(--gray-600);

        &::before {
          content: '✓';
          color: var(--success);
          font-weight: bold;
        }
      }
    }

    .empty-actions {
      display: flex;
      gap: var(--spacing-md);
      margin-top: var(--spacing-md);
    }

    .btn-lg {
      padding: var(--spacing-md) var(--spacing-xl);
      font-size: 1rem;
    }

    .empty-state--compact {
      min-height: 200px;
      padding: var(--spacing-xl);

      .empty-illustration {
        width: 80px;
        height: 80px;
        margin-bottom: var(--spacing-md);
      }

      .empty-icon {
        font-size: 2.5rem;
      }

      .empty-title {
        font-size: 1.125rem;
      }

      .empty-description {
        font-size: 0.875rem;
      }
    }

    @media (max-width: 768px) {
      .empty-state {
        padding: var(--spacing-xl);
        min-height: 280px;
      }

      .empty-illustration {
        width: 100px;
        height: 100px;
      }

      .empty-icon {
        font-size: 3rem;
      }

      .empty-title {
        font-size: 1.25rem;
      }

      .empty-description {
        font-size: 0.875rem;
      }

      .empty-features li {
        font-size: 0.75rem;
      }
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon = '📋';
  @Input() title = 'No data';
  @Input() description = 'No results found to display';
  @Input() actionText?: string;
  @Input() actionLink?: string;
  @Input() secondaryActionText?: string;
  @Input() features: string[] = [];
  @Input() variant: 'default' | 'compact' = 'default';
  @Input() color: 'blue' | 'green' | 'purple' | 'amber' | 'gray' = 'blue';

  @Output() action = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();

  onAction(): void {
    this.action.emit();
  }

  onSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}
