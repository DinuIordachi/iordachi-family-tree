import { Routes } from '@angular/router';

export const FAMILY_MEMBER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./family-member-list/family-member-list.component').then(
        (m) => m.FamilyMemberListComponent,
      ),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./family-member-edit/family-member-edit.component').then(
        (m) => m.FamilyMemberEditComponent,
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./family-member-edit/family-member-edit.component').then(
        (m) => m.FamilyMemberEditComponent,
      ),
  },
];
