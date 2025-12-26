import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Settings</h1>
        <p class="text-muted">Manage your account and company</p>
      </header>

      <div class="settings-grid">
        <a routerLink="/settings/company" class="settings-card">
          <span class="icon">🏢</span>
          <div class="info">
            <h3>Company</h3>
            <p>Tax details, logo and general settings</p>
          </div>
        </a>

        <a routerLink="/settings/profile" class="settings-card">
          <span class="icon">👤</span>
          <div class="info">
            <h3>Profile</h3>
            <p>Your personal information and password</p>
          </div>
        </a>

        <a routerLink="/invoicing/series" class="settings-card">
          <span class="icon">🔢</span>
          <div class="info">
            <h3>Invoice Series</h3>
            <p>Configure invoice numbering</p>
          </div>
        </a>

        <a routerLink="/accounting/fiscal-years" class="settings-card">
          <span class="icon">📅</span>
          <div class="info">
            <h3>Fiscal Years</h3>
            <p>Manage accounting periods</p>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
    }

    .page-header {
      margin-bottom: var(--spacing-xl);

      p { margin: var(--spacing-xs) 0 0; }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-lg);
    }

    .settings-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      text-decoration: none;
      color: inherit;
      transition: all var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .icon {
        font-size: 2.5rem;
      }

      .info h3 {
        margin: 0 0 var(--spacing-xs);
      }

      .info p {
        margin: 0;
        color: var(--gray-500);
        font-size: 0.875rem;
      }
    }
  `],
})
export class SettingsComponent {}
