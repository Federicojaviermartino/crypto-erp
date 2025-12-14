import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="alertClass" *ngIf="visible">
      <span [class]="iconClass">{{ icon }}</span>
      <div class="alert-content" *ngIf="title || message || details">
        <div class="alert-title" *ngIf="title">{{ title }}</div>
        <div class="alert-message" *ngIf="message">{{ message }}</div>
        <div class="alert-details" *ngIf="details">{{ details }}</div>
      </div>
      <ng-content></ng-content>
      <button
        *ngIf="dismissible"
        class="alert-dismiss"
        (click)="dismiss()"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .error-message,
    .success-message,
    .warning-message,
    .info-message {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      margin: var(--spacing-sm) 0;
      position: relative;
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid var(--danger);
      color: #991b1b;
    }

    .success-message {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid var(--success);
      color: #166534;
    }

    .warning-message {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid var(--warning);
      color: #92400e;
    }

    .info-message {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-left: 4px solid var(--info);
      color: #075985;
    }

    .error-icon,
    .success-icon,
    .warning-icon,
    .info-icon {
      flex-shrink: 0;
      font-size: 1.25rem;
      line-height: 1;
    }

    .alert-content {
      flex: 1;
    }

    .alert-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .alert-message {
      margin-bottom: 0.25rem;
    }

    .alert-details {
      font-size: 0.813rem;
      opacity: 0.8;
      margin-top: 0.25rem;
    }

    .alert-dismiss {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      opacity: 0.6;
      transition: opacity var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.05);
      }
    }
  `],
})
export class AlertComponent {
  @Input() type: AlertType = 'info';
  @Input() title?: string;
  @Input() message?: string;
  @Input() details?: string;
  @Input() dismissible = false;

  visible = true;

  get alertClass(): string {
    return `${this.type}-message`;
  }

  get iconClass(): string {
    return `${this.type}-icon`;
  }

  get icon(): string {
    const icons = {
      error: '⚠️',
      success: '✓',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[this.type];
  }

  dismiss(): void {
    this.visible = false;
  }
}
