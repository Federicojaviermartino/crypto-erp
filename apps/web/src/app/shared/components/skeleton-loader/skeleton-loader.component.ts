import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type) {
      @case ('table') {
        <div class="skeleton-table">
          <!-- Header -->
          <div class="skeleton-row skeleton-header">
            @for (col of columns; track col) {
              <div class="skeleton skeleton-cell" [style.width]="col"></div>
            }
          </div>
          <!-- Rows -->
          @for (row of rows; track row) {
            <div class="skeleton-row">
              @for (col of columns; track col) {
                <div class="skeleton skeleton-cell" [style.width]="col"></div>
              }
            </div>
          }
        </div>
      }
      @case ('card') {
        <div class="skeleton-card-wrapper">
          @for (card of cards; track card) {
            <div class="skeleton-card">
              @if (showImage) {
                <div class="skeleton skeleton-image"></div>
              }
              <div class="skeleton-content">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
              </div>
            </div>
          }
        </div>
      }
      @case ('stats') {
        <div class="skeleton-stats">
          @for (stat of stats; track stat) {
            <div class="skeleton-stat-card">
              <div class="skeleton skeleton-icon"></div>
              <div class="skeleton-stat-content">
                <div class="skeleton skeleton-number"></div>
                <div class="skeleton skeleton-label"></div>
              </div>
            </div>
          }
        </div>
      }
      @case ('list') {
        <div class="skeleton-list">
          @for (item of items; track item) {
            <div class="skeleton-list-item">
              <div class="skeleton skeleton-avatar"></div>
              <div class="skeleton-list-content">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
              </div>
            </div>
          }
        </div>
      }
      @default {
        <div class="skeleton-default">
          <div class="skeleton skeleton-block"></div>
        </div>
      }
    }
  `,
  styles: [`
    // Base skeleton animation
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--gray-200) 25%,
        var(--gray-100) 50%,
        var(--gray-200) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: var(--radius-md);
    }

    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    // Table skeleton
    .skeleton-table {
      width: 100%;
    }

    .skeleton-row {
      display: flex;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--gray-100);

      &.skeleton-header {
        background: var(--gray-50);
      }
    }

    .skeleton-cell {
      height: 1rem;
      flex: 1;
    }

    // Card skeleton
    .skeleton-card-wrapper {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--spacing-lg);
    }

    .skeleton-card {
      background: var(--white);
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      overflow: hidden;
      padding: var(--spacing-lg);
    }

    .skeleton-image {
      height: 150px;
      margin: calc(-1 * var(--spacing-lg));
      margin-bottom: var(--spacing-lg);
      border-radius: 0;
    }

    .skeleton-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .skeleton-title {
      height: 1.5rem;
      width: 70%;
    }

    .skeleton-text {
      height: 1rem;
      width: 100%;

      &.short {
        width: 50%;
      }
    }

    // Stats skeleton
    .skeleton-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--spacing-lg);
    }

    .skeleton-stat-card {
      background: var(--white);
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      padding: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .skeleton-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .skeleton-stat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .skeleton-number {
      height: 2rem;
      width: 60%;
    }

    .skeleton-label {
      height: 0.875rem;
      width: 80%;
    }

    // List skeleton
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .skeleton-list-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: var(--white);
      border-radius: var(--radius-md);
      border: 1px solid var(--gray-200);
    }

    .skeleton-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .skeleton-list-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    // Default skeleton
    .skeleton-default {
      padding: var(--spacing-lg);
    }

    .skeleton-block {
      height: 200px;
      width: 100%;
    }
  `],
})
export class SkeletonLoaderComponent {
  @Input() type: 'table' | 'card' | 'stats' | 'list' | 'default' = 'default';
  @Input() rowCount = 5;
  @Input() cardCount = 3;
  @Input() statCount = 4;
  @Input() itemCount = 5;
  @Input() showImage = false;
  @Input() columnWidths: string[] = ['20%', '30%', '20%', '15%', '15%'];

  get rows() {
    return Array(this.rowCount).fill(0).map((_, i) => i);
  }

  get cards() {
    return Array(this.cardCount).fill(0).map((_, i) => i);
  }

  get stats() {
    return Array(this.statCount).fill(0).map((_, i) => i);
  }

  get items() {
    return Array(this.itemCount).fill(0).map((_, i) => i);
  }

  get columns() {
    return this.columnWidths;
  }
}
