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
        <h1>Configuración</h1>
        <p class="text-muted">Gestiona tu cuenta y empresa</p>
      </header>

      <div class="settings-grid">
        <a routerLink="/settings/company" class="settings-card">
          <span class="icon">🏢</span>
          <div class="info">
            <h3>Empresa</h3>
            <p>Datos fiscales, logo y configuración general</p>
          </div>
        </a>

        <a routerLink="/settings/profile" class="settings-card">
          <span class="icon">👤</span>
          <div class="info">
            <h3>Perfil</h3>
            <p>Tu información personal y contraseña</p>
          </div>
        </a>

        <a routerLink="/invoicing/series" class="settings-card">
          <span class="icon">🔢</span>
          <div class="info">
            <h3>Series de Facturación</h3>
            <p>Configurar numeración de facturas</p>
          </div>
        </a>

        <a routerLink="/accounting/fiscal-years" class="settings-card">
          <span class="icon">📅</span>
          <div class="info">
            <h3>Años Fiscales</h3>
            <p>Gestionar ejercicios contables</p>
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
