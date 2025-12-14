import { Routes } from '@angular/router';

export const ACCOUNTING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'accounts',
    pathMatch: 'full',
  },
  {
    path: 'accounts',
    loadComponent: () => import('./accounts/accounts-list.component').then(m => m.AccountsListComponent),
  },
  {
    path: 'journal-entries',
    loadComponent: () => import('./journal-entries/journal-entries-list.component').then(m => m.JournalEntriesListComponent),
  },
  {
    path: 'journal-entries/new',
    loadComponent: () => import('./journal-entries/journal-entry-form.component').then(m => m.JournalEntryFormComponent),
  },
  {
    path: 'fiscal-years',
    loadComponent: () => import('./fiscal-years/fiscal-years-list.component').then(m => m.FiscalYearsListComponent),
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent),
  },
];
