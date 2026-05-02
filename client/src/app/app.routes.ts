import { Routes } from '@angular/router';
import { AppLayout } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'tree',
    loadComponent: () => import('./features/tree/tree.component').then(m => m.TreeComponent)
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'garages',
        loadChildren: () => import('./features/garages/garage.routes').then(m => m.GARAGE_ROUTES)
      },
      {
        path: 'persons',
        loadChildren: () => import('./features/persons/person.routes').then(m => m.PERSON_ROUTES)
      },
      {
        path: 'associations',
        loadChildren: () => import('./features/associations/association.routes').then(m => m.ASSOCIATION_ROUTES)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
