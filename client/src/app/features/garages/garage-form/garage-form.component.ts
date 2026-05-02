import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { FloatLabel } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmDialogComponent, PersonRoleDialogComponent } from '@app/shared/components';
import { AssociationService, GarageService, NotificationService } from '@app/core/services';
import { GaragePersonRole, LimitedAssociation, PersonRolePayload } from '@app/core/models';
import { GarageStatus } from '@app/core/enums';

@Component({
  selector: 'app-garage-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    InputNumber,
    Select,
    FloatLabel,
    TableModule,
    AutoComplete,
    Skeleton,
    ConfirmDialogComponent,
    PersonRoleDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './garage-form.component.html',
  styles: ``,
})
export class GarageFormComponent implements OnInit {
  isEdit = signal(false);
  garageId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  showPersonRoleDialog = signal(false);
  personRoles = signal<GaragePersonRole[]>([]);
  associationSuggestions = signal<LimitedAssociation[]>([]);
  statusOptions = [
    { label: 'Normal', value: GarageStatus.NORMAL },
    { label: 'Seized by State', value: GarageStatus.SEIZED_BY_STATE },
    { label: 'Under Investigation', value: GarageStatus.UNDER_STATE_INVESTIGATION },
  ];
  private readonly fb = inject(FormBuilder);
  form: FormGroup = this.fb.group({
    association: [null, Validators.required],
    name: ['', Validators.required],
    status: [GarageStatus.NORMAL, Validators.required],
    city: ['', Validators.required],
    street: ['', Validators.required],
    internalAddress: [''],
    addressNumber: [''],
    cadastralNumber: ['', Validators.required],
    area: [null, [Validators.required, Validators.min(0)]],
  });
  private readonly garageService = inject(GarageService);
  private readonly associationService = inject(AssociationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.garageId.set(+id);
      this.loadGarage(+id);
    }
  }

  loadGarage(id: number): void {
    this.loading.set(true);
    this.garageService.show(id).subscribe({
      next: (res) => {
        const g = res.data;
        this.form.patchValue({
          association: g.association ? { id: g.association.id, name: g.association.name } : null,
          name: g.name,
          status: g.status,
          city: g.city,
          street: g.street,
          internalAddress: g.internalAddress,
          addressNumber: g.addressNumber,
          cadastralNumber: g.cadastralNumber,
          area: g.area,
        });
        this.personRoles.set(g.personRoles || []);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load garage.');
        this.loading.set(false);
      },
    });
  }

  searchAssociations(event: AutoCompleteCompleteEvent): void {
    this.associationService.list(1).subscribe((res) => {
      const query = event.query.toLowerCase();
      this.associationSuggestions.set(
        res.data
          .filter((a) => a.name.toLowerCase().includes(query))
          .map((a) => ({ id: a.id, name: a.name })),
      );
    });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.form.value;
    const body: any = {
      associationId: val.association?.id,
      name: val.name,
      status: val.status,
      city: val.city,
      street: val.street,
      internalAddress: val.internalAddress || '',
      addressNumber: val.addressNumber || '',
      cadastralNumber: val.cadastralNumber,
      area: val.area,
    };

    const obs = this.isEdit()
      ? this.garageService.update(this.garageId()!, body)
      : this.garageService.store(body);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success(this.isEdit() ? 'Garage updated.' : 'Garage created.');
        void this.router.navigate(['/garages']);
      },
      error: () => {
        this.saving.set(false);
        this.notification.error('Failed to save garage.');
      },
    });
  }

  onPersonRoleSaved(data: PersonRolePayload): void {
    this.showPersonRoleDialog.set(false);
    this.garageService.assignPerson(this.garageId()!, data).subscribe({
      next: () => {
        this.notification.success('Person assigned.');
        this.loadGarage(this.garageId()!);
      },
      error: () => this.notification.error('Failed to assign person.'),
    });
  }

  confirmRemovePerson(pr: GaragePersonRole): void {
    this.confirmationService.confirm({
      message: `Remove ${pr.person?.lastName} ${pr.person?.firstName} from this garage?`,
      header: 'Confirm Remove',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptIcon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectButtonStyleClass: 'p-button-secondary',
      rejectLabel: 'Cancel',
      accept: () => {
        this.garageService.removePerson(this.garageId()!, pr.id).subscribe({
          next: () => {
            this.notification.success('Person removed.');
            this.loadGarage(this.garageId()!);
          },
          error: () => this.notification.error('Failed to remove person.'),
        });
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/garages']);
  }
}
