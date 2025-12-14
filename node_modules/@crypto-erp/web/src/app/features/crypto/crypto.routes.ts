import { Routes } from '@angular/router';

export const CRYPTO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'portfolio',
    pathMatch: 'full',
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./portfolio/portfolio.component').then(m => m.PortfolioComponent),
  },
  {
    path: 'wallets',
    loadComponent: () => import('./wallets/wallets-list.component').then(m => m.WalletsListComponent),
  },
  {
    path: 'exchanges',
    loadComponent: () => import('./exchanges/exchanges-list.component').then(m => m.ExchangesListComponent),
  },
  {
    path: 'transactions',
    loadComponent: () => import('./transactions/transactions-list.component').then(m => m.TransactionsListComponent),
  },
  {
    path: 'transactions/new',
    loadComponent: () => import('./transactions/transaction-form.component').then(m => m.TransactionFormComponent),
  },
  {
    path: 'assets',
    loadComponent: () => import('./assets/assets-list.component').then(m => m.AssetsListComponent),
  },
  {
    path: 'tax-report',
    loadComponent: () => import('./modelo721/modelo721.component').then(m => m.Modelo721Component),
  },
];
