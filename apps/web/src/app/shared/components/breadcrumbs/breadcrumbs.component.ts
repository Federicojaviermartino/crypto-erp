import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
          <a routerLink="/dashboard" class="breadcrumb-link home-link">
            <span class="home-icon">🏠</span>
            @if (!compact) {
              <span>Home</span>
            }
          </a>
        </li>
        @for (item of items; track item.label; let isLast = $last) {
          <li class="breadcrumb-item">
            <span class="breadcrumb-separator">/</span>
            @if (isLast || !item.link) {
              <span class="breadcrumb-current" [class.with-icon]="item.icon">
                @if (item.icon) {
                  <span class="breadcrumb-icon">{{ item.icon }}</span>
                }
                {{ item.label }}
              </span>
            } @else {
              <a [routerLink]="item.link" class="breadcrumb-link">
                @if (item.icon) {
                  <span class="breadcrumb-icon">{{ item.icon }}</span>
                }
                {{ item.label }}
              </a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumbs {
      margin-bottom: var(--spacing-md);
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .breadcrumb-separator {
      color: var(--gray-400);
      font-size: 0.875rem;
      margin: 0 var(--spacing-xs);
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--gray-500);
      text-decoration: none;
      font-size: 0.875rem;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover {
        color: var(--primary);
        background: var(--gray-100);
        text-decoration: none;
      }
    }

    .home-link {
      .home-icon {
        font-size: 1rem;
      }
    }

    .breadcrumb-current {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--gray-900);
      font-size: 0.875rem;
      font-weight: 500;
      padding: var(--spacing-xs) var(--spacing-sm);
    }

    .breadcrumb-icon {
      font-size: 1rem;
    }

    @media (max-width: 768px) {
      .breadcrumb-list {
        font-size: 0.813rem;
      }

      .breadcrumb-link,
      .breadcrumb-current {
        padding: var(--spacing-xs);
      }
    }
  `],
})
export class BreadcrumbsComponent {
  @Input() items: BreadcrumbItem[] = [];
  @Input() compact = false;
}
