import { Routes } from '@angular/router';

export const INVOICING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'invoices',
    pathMatch: 'full',
  },
  {
    path: 'invoices',
    loadComponent: () => import('./invoices/invoices-list.component').then(m => m.InvoicesListComponent),
  },
  {
    path: 'invoices/new',
    loadComponent: () => import('./invoices/invoice-form.component').then(m => m.InvoiceFormComponent),
  },
  {
    path: 'contacts',
    loadComponent: () => import('./contacts/contacts-list.component').then(m => m.ContactsListComponent),
  },
  {
    path: 'series',
    loadComponent: () => import('./series/series-list.component').then(m => m.SeriesListComponent),
  },
];
