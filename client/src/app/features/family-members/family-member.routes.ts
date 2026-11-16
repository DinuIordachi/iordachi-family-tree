import { CanDeactivateFn, Routes } from '@angular/router';
import type { FamilyMemberEditComponent } from './family-member-edit/family-member-edit.component';

/** Ask before leaving the editor with unsaved changes. */
const confirmUnsavedChanges: CanDeactivateFn<FamilyMemberEditComponent> = (component) =>
  component?.canLeave?.() ?? true;

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
    canDeactivate: [confirmUnsavedChanges],
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./family-member-edit/family-member-edit.component').then(
        (m) => m.FamilyMemberEditComponent,
      ),
    canDeactivate: [confirmUnsavedChanges],
  },
];
