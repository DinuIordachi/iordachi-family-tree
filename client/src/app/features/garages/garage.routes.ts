import { Routes } from '@angular/router';

export const GARAGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./garage-list/garage-list.component').then(m => m.GarageListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./garage-form/garage-form.component').then(m => m.GarageFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./garage-form/garage-form.component').then(m => m.GarageFormComponent)
  }
];
