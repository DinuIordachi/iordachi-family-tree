import { Routes } from '@angular/router';

export const ASSOCIATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./association-list/association-list.component').then(m => m.AssociationListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./association-form/association-form.component').then(m => m.AssociationFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./association-form/association-form.component').then(m => m.AssociationFormComponent)
  }
];
