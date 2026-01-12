import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'danger' | 'warning';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-overlay" (click)="cancel()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>{{ config()?.title }}</h3>
            <button class="close-btn" (click)="cancel()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="dialog-body">
            <p>{{ config()?.message }}</p>
          </div>
          <div class="dialog-footer">
            <button class="btn btn-secondary" (click)="cancel()">
              {{ config()?.cancelText || 'Cancel' }}
            </button>
            <button
              class="btn"
              [class.btn-primary]="config()?.confirmColor === 'primary' || !config()?.confirmColor"
              [class.btn-danger]="config()?.confirmColor === 'danger'"
              [class.btn-warning]="config()?.confirmColor === 'warning'"
              (click)="confirm()">
              {{ config()?.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
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
      animation: fadeIn 0.15s ease-out;
    }

    .dialog {
      background: var(--gray-800, #1f2937);
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      min-width: 320px;
      max-width: 480px;
      animation: slideIn 0.2s ease-out;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--gray-700, #374151);
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--gray-100, #f3f4f6);
    }

    .close-btn {
      background: none;
      border: none;
      padding: 0.25rem;
      cursor: pointer;
      color: var(--gray-400, #9ca3af);
      border-radius: var(--radius-sm, 4px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: var(--gray-700, #374151);
      color: var(--gray-200, #e5e7eb);
    }

    .dialog-body {
      padding: 1.25rem;
    }

    .dialog-body p {
      margin: 0;
      color: var(--gray-300, #d1d5db);
      line-height: 1.5;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--gray-700, #374151);
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md, 8px);
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }

    .btn-secondary {
      background: var(--gray-700, #374151);
      color: var(--gray-200, #e5e7eb);
    }

    .btn-secondary:hover {
      background: var(--gray-600, #4b5563);
    }

    .btn-primary {
      background: var(--primary, #3b82f6);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-dark, #2563eb);
    }

    .btn-danger {
      background: var(--danger, #ef4444);
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-warning {
      background: var(--warning, #f59e0b);
      color: white;
    }

    .btn-warning:hover {
      background: #d97706;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `]
})
export class ConfirmDialogComponent {
  isOpen = signal(false);
  config = signal<ConfirmDialogConfig | null>(null);

  private resolvePromise: ((value: boolean) => void) | null = null;

  open(config: ConfirmDialogConfig): Promise<boolean> {
    this.config.set(config);
    this.isOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  confirm(): void {
    this.isOpen.set(false);
    this.resolvePromise?.(true);
    this.resolvePromise = null;
  }

  cancel(): void {
    this.isOpen.set(false);
    this.resolvePromise?.(false);
    this.resolvePromise = null;
  }
}
