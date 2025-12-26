import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 class="logo">
            @if (!sidebarCollapsed()) {
              Crypto ERP
            } @else {
              CE
            }
          </h2>
          <button class="toggle-btn" (click)="toggleSidebar()">
            {{ sidebarCollapsed() ? '→' : '←' }}
          </button>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-item"
              [title]="item.label"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              @if (!sidebarCollapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          @if (!sidebarCollapsed()) {
            <div class="user-info">
              <span class="user-name">{{ authService.currentUser()?.firstName }}</span>
              <span class="user-email">{{ authService.currentUser()?.email }}</span>
            </div>
          }
          <button class="logout-btn" (click)="logout()" title="Sign Out">
            🚪
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 260px;
      background: var(--gray-900);
      color: var(--white);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-normal);
      position: fixed;
      height: 100vh;
      z-index: 100;
    }

    .sidebar-collapsed .sidebar {
      width: 70px;
    }

    .sidebar-header {
      padding: var(--spacing-lg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--gray-700);
    }

    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary-light);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
    }

    .toggle-btn {
      background: var(--gray-700);
      border: none;
      color: var(--white);
      width: 28px;
      height: 28px;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--gray-600);
      }
    }

    .sidebar-nav {
      flex: 1;
      padding: var(--spacing-md);
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      padding: var(--spacing-sm) var(--spacing-md);
      color: var(--gray-300);
      text-decoration: none;
      border-radius: var(--radius-md);
      margin-bottom: var(--spacing-xs);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--gray-800);
        color: var(--white);
      }

      &.active {
        background: var(--primary);
        color: var(--white);
      }
    }

    .nav-icon {
      font-size: 1.25rem;
      width: 24px;
      text-align: center;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar-footer {
      padding: var(--spacing-md);
      border-top: 1px solid var(--gray-700);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .user-info {
      flex: 1;
      overflow: hidden;

      .user-name {
        display: block;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-email {
        display: block;
        font-size: 0.75rem;
        color: var(--gray-400);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .logout-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: var(--spacing-sm);
      border-radius: var(--radius-md);

      &:hover {
        background: var(--gray-700);
      }
    }

    .main-content {
      flex: 1;
      margin-left: 260px;
      background: var(--gray-50);
      min-height: 100vh;
      transition: margin-left var(--transition-normal);
    }

    .sidebar-collapsed .main-content {
      margin-left: 70px;
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 70px;
      }

      .main-content {
        margin-left: 70px;
      }

      .nav-label,
      .user-info,
      .toggle-btn {
        display: none;
      }
    }
  `],
})
export class MainLayoutComponent {
  sidebarCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Accounting', path: '/accounting', icon: '📒' },
    { label: 'Invoicing', path: '/invoicing', icon: '🧾' },
    { label: 'Crypto', path: '/crypto', icon: '₿' },
    { label: 'AI Assistant', path: '/ai', icon: '🤖' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  constructor(public authService: AuthService) {}

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}
