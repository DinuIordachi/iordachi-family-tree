import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmDialogComponent } from '@app/shared/components';
import { NotificationService, PersonService } from '@app/core/services';
import { AssociationPersonRole, Contact, GaragePersonRole, Person } from '@app/core/models';
import { ContactType } from '@app/core/enums';

@Component({
  selector: 'app-person-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    Button,
    InputText,
    FloatLabel,
    TableModule,
    Select,
    Checkbox,
    Skeleton,
    ConfirmDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './person-form.component.html',
  styles: ``,
})
export class PersonFormComponent implements OnInit {
  isEdit = signal(false);
  personId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  person = signal<Person | null>(null);
  contacts = signal<Contact[]>([]);
  garageRoles = signal<GaragePersonRole[]>([]);
  associationRoles = signal<AssociationPersonRole[]>([]);
  contactTypeOptions = [
    { label: 'Email', value: ContactType.EMAIL },
    { label: 'Phone', value: ContactType.PHONE },
  ];
  private readonly fb = inject(FormBuilder);
  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    patronymic: [''],
  });
  private readonly personService = inject(PersonService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.personId.set(+id);
      this.loadPerson(+id);
    }
  }

  loadPerson(id: number): void {
    this.loading.set(true);
    this.personService.show(id).subscribe({
      next: (res) => {
        const p = res.data;
        this.person.set(p);
        this.form.patchValue({
          firstName: p.firstName,
          lastName: p.lastName,
          patronymic: p.patronymic,
        });
        this.contacts.set(p.contacts ? [...p.contacts] : []);
        this.garageRoles.set(p.garageRoles || []);
        this.associationRoles.set(p.associationRoles || []);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load person.');
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
      ? this.personService.update(this.personId()!, body)
      : this.personService.store(body);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success(this.isEdit() ? 'Person updated.' : 'Person created.');
        void this.router.navigate(['/persons']);
      },
      error: () => {
        this.saving.set(false);
        this.notification.error('Failed to save person.');
      },
    });
  }

  addContactRow(): void {
    const newContact: Contact = {
      id: 0,
      type: ContactType.PHONE,
      value: '',
      favorite: false,
      whatsapp: false,
      viber: false,
      telegram: false,
      calls: false,
      sms: false,
    };
    this.contacts.update((c) => [...c, newContact]);
  }

  saveContact(contact: Contact): void {
    const data: Partial<Contact> = {
      type: contact.type,
      value: contact.value,
      favorite: contact.favorite,
      whatsapp: contact.whatsapp,
      viber: contact.viber,
      telegram: contact.telegram,
      calls: contact.calls,
      sms: contact.sms,
    };

    if (contact.id) {
      this.personService.updateContact(this.personId()!, contact.id, data).subscribe({
        next: () => {
          this.notification.success('Contact updated.');
          this.loadPerson(this.personId()!);
        },
        error: () => this.notification.error('Failed to update contact.'),
      });
    } else {
      this.personService.addContact(this.personId()!, data).subscribe({
        next: () => {
          this.notification.success('Contact added.');
          this.loadPerson(this.personId()!);
        },
        error: () => this.notification.error('Failed to add contact.'),
      });
    }
  }

  confirmRemoveContact(contact: Contact): void {
    if (!contact.id) {
      this.contacts.update((c) => c.filter((x) => x !== contact));
      return;
    }

    this.confirmationService.confirm({
      message: `Remove this contact?`,
      header: 'Confirm Remove',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.personService.removeContact(this.personId()!, contact.id).subscribe({
          next: () => {
            this.notification.success('Contact removed.');
            this.loadPerson(this.personId()!);
          },
          error: () => this.notification.error('Failed to remove contact.'),
        });
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/persons']);
  }
}
