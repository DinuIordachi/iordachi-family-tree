import { Routes } from '@angular/router';
import { AppLayout } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'tree',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tree/tree.component').then(m => m.TreeComponent)
  },
  {
    path: 'tree-of-life',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tree-of-life/tree-of-life.component').then(m => m.TreeOfLifeComponent)
  },
  /* The tree is the front door (after login); the admin lives under the layout. */
  { path: '', redirectTo: 'tree', pathMatch: 'full' },
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
        path: 'family-members',
        loadChildren: () => import('./features/family-members/family-member.routes').then(m => m.FAMILY_MEMBER_ROUTES)
      },
      {
        path: 'activity',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/activity/activity-log.component').then(m => m.ActivityLogComponent)
      },
    ]
  },
  { path: '**', redirectTo: 'tree' }
];
