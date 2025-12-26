import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '@core/services/api.service';

interface Insight {
  category: 'tax' | 'crypto' | 'accounting' | 'optimization';
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel?: string;
  actionPath?: string;
}

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="insights-widget">
      <div class="widget-header">
        <h3>💡 AI Recommendations</h3>
        <button
          class="refresh-btn"
          (click)="loadInsights()"
          [disabled]="loading()">
          🔄 {{ loading() ? 'Generating...' : 'Refresh' }}
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <span class="spinner"></span>
          <p>Analyzing your finances with AI...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>❌ Error generating insights</p>
          <button class="btn btn-sm btn-secondary" (click)="loadInsights()">Retry</button>
        </div>
      } @else if (insights().length === 0) {
        <div class="empty-state">
          <p>✅ All good</p>
          <small>No recommendations at this time</small>
        </div>
      } @else {
        <div class="insights-list">
          @for (insight of insights(); track $index) {
            <div
              class="insight-item"
              [class.high-priority]="insight.priority === 'high'"
              [class.medium-priority]="insight.priority === 'medium'"
              [class.low-priority]="insight.priority === 'low'">
              <div class="insight-header">
                <span class="insight-icon">{{ getCategoryIcon(insight.category) }}</span>
                <span class="insight-badge" [class]="'badge-' + insight.category">
                  {{ getCategoryLabel(insight.category) }}
                </span>
                @if (insight.priority === 'high') {
                  <span class="priority-badge">⚠️ High</span>
                }
              </div>
              <p class="insight-message">{{ insight.message }}</p>
              @if (insight.actionLabel && insight.actionPath) {
                <a
                  [routerLink]="insight.actionPath"
                  class="insight-action">
                  {{ insight.actionLabel }} →
                </a>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .insights-widget {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      box-shadow: var(--shadow-sm);
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);

      h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
      }
    }

    .refresh-btn {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--gray-300);
      background: var(--white);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gray-700);
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--gray-50);
        border-color: var(--primary-500);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .loading-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xxl);
      text-align: center;

      p {
        margin: var(--spacing-sm) 0;
        color: var(--gray-600);
      }

      small {
        color: var(--gray-500);
      }
    }

    .insights-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .insight-item {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      border-left: 4px solid var(--gray-300);
      background: var(--gray-50);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--white);
        box-shadow: var(--shadow-sm);
      }

      &.high-priority {
        border-left-color: #ef4444;
        background: #fef2f2;
      }

      &.medium-priority {
        border-left-color: #f59e0b;
        background: #fffbeb;
      }

      &.low-priority {
        border-left-color: #3b82f6;
        background: #eff6ff;
      }
    }

    .insight-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-sm);
    }

    .insight-icon {
      font-size: 1.25rem;
    }

    .insight-badge {
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;

      &.badge-tax {
        background: #dbeafe;
        color: #1e40af;
      }

      &.badge-crypto {
        background: #fef3c7;
        color: #92400e;
      }

      &.badge-accounting {
        background: #dcfce7;
        color: #166534;
      }

      &.badge-optimization {
        background: #f3e8ff;
        color: #6b21a8;
      }
    }

    .priority-badge {
      margin-left: auto;
      padding: 2px var(--spacing-xs);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      background: #fee2e2;
      color: #991b1b;
    }

    .insight-message {
      margin: 0 0 var(--spacing-sm);
      color: var(--gray-700);
      line-height: 1.5;
    }

    .insight-action {
      display: inline-block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary-600);
      text-decoration: none;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--primary-700);
        text-decoration: underline;
      }
    }
  `],
})
export class AiInsightsComponent implements OnInit {
  loading = signal(false);
  error = signal(false);
  insights = signal<Insight[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadInsights();
  }

  loadInsights(): void {
    this.loading.set(true);
    this.error.set(false);

    this.api.post<{ insights: Insight[] }>('/ai/generate-insights', {}).subscribe({
      next: (data) => {
        this.insights.set(data.insights || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to generate insights:', err);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      tax: '💰',
      crypto: '₿',
      accounting: '📊',
      optimization: '⚡',
    };
    return icons[category] || '💡';
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      tax: 'Tax',
      crypto: 'Crypto',
      accounting: 'Accounting',
      optimization: 'Optimization',
    };
    return labels[category] || category;
  }
}
