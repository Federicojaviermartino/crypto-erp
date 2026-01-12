import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  svgPath: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <!-- Sidebar - Icon only -->
      <aside class="sidebar">
        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-item"
              [title]="item.label"
            >
              <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="item.svgPath"/>
              </svg>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item logout-btn" (click)="logout()" title="Sign Out">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
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
      width: 70px;
      background: var(--gray-900);
      color: var(--white);
      display: flex;
      flex-direction: column;
      position: fixed;
      height: 100vh;
      z-index: 100;
    }

    .sidebar-nav {
      flex: 1;
      padding: var(--spacing-sm);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .nav-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-sm);
      color: var(--gray-300);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;

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
      width: 24px;
      height: 24px;
    }


    .sidebar-footer {
      padding: var(--spacing-sm);
      border-top: 1px solid var(--gray-700);
    }

    .logout-btn {
      width: 100%;
    }

    .main-content {
      flex: 1;
      margin-left: 70px;
      background: var(--gray-50);
      min-height: 100vh;
    }
  `],
})
export class MainLayoutComponent {
  sidebarCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', svgPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
    { label: 'Accounting', path: '/accounting', icon: 'accounting', svgPath: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4v16h16V7l-5-3H4z' },
    { label: 'Invoicing', path: '/invoicing', icon: 'invoicing', svgPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
    { label: 'Crypto', path: '/crypto', icon: 'crypto', svgPath: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { label: 'AI Assistant', path: '/ai', icon: 'ai', svgPath: 'M12 8V4H8 M12 8V4h4 M12 8v8 M12 16v4h-4 M12 16v4h4 M20 12h-4 M8 12H4' },
    { label: 'Settings', path: '/settings', icon: 'settings', svgPath: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' },
  ];

  constructor(public authService: AuthService) {}

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}
