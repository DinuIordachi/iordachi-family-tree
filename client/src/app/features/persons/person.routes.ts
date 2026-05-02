import { Routes } from '@angular/router';

export const PERSON_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./person-list/person-list.component').then(m => m.PersonListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./person-form/person-form.component').then(m => m.PersonFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./person-form/person-form.component').then(m => m.PersonFormComponent)
  }
];
