import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmDialogComponent, PersonRoleDialogComponent } from '@app/shared/components';
import { AssociationService, NotificationService } from '@app/core/services';
import { AssociationPersonRole, Garage } from '@app/core/models';

@Component({
  selector: 'app-association-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    FloatLabel,
    Card,
    TableModule,
    Tag,
    Skeleton,
    ConfirmDialogComponent,
    PersonRoleDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './association-form.component.html',
  styles: ``,
})
export class AssociationFormComponent implements OnInit {
  isEdit = signal(false);
  associationId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  showPersonRoleDialog = signal(false);
  personRoles = signal<AssociationPersonRole[]>([]);
  garages = signal<Garage[]>([]);
  private readonly fb = inject(FormBuilder);
  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    phone: [''],
    cadastralNumber: [''],
  });
  private readonly associationService = inject(AssociationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.associationId.set(+id);
      this.loadAssociation(+id);
    }
  }

  loadAssociation(id: number): void {
    this.loading.set(true);
    this.associationService.show(id).subscribe({
      next: (res) => {
        const a = res.data as any;
        this.form.patchValue({
          name: a.name,
          address: a.address,
          phone: a.phone,
          cadastralNumber: a.cadastralNumber || '',
        });
        this.personRoles.set(a.personRoles || []);
        this.garages.set(a.garages || []);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load association.');
        this.loading.set(false);
      },
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const body = this.form.value;

    const obs = this.isEdit()
      ? this.associationService.update(this.associationId()!, body)
      : this.associationService.store(body);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success(this.isEdit() ? 'Association updated.' : 'Association created.');
        void this.router.navigate(['/associations']);
      },
      error: () => {
        this.saving.set(false);
        this.notification.error('Failed to save association.');
      },
    });
  }

  onPersonRoleSaved(data: { personId: number; roleId: number; startDate?: string }): void {
    this.showPersonRoleDialog.set(false);
    this.associationService.assignPerson(this.associationId()!, data).subscribe({
      next: () => {
        this.notification.success('Person assigned.');
        this.loadAssociation(this.associationId()!);
      },
      error: () => this.notification.error('Failed to assign person.'),
    });
  }

  confirmRemovePerson(pr: AssociationPersonRole): void {
    this.confirmationService.confirm({
      message: `Remove ${pr.person?.lastName} ${pr.person?.firstName} from this association?`,
      header: 'Confirm Remove',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.associationService.removePerson(this.associationId()!, pr.id).subscribe({
          next: () => {
            this.notification.success('Person removed.');
            this.loadAssociation(this.associationId()!);
          },
          error: () => this.notification.error('Failed to remove person.'),
        });
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/associations']);
  }
}
