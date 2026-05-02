import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ConfirmDialogComponent } from '@app/shared/components';
import { NotificationService, PersonService } from '@app/core/services';
import { Person } from '@app/core/models';

@Component({
  selector: 'app-person-list',
  standalone: true,
  imports: [TableModule, Button, InputText, IconField, InputIcon, ConfirmDialogComponent],
  providers: [ConfirmationService],
  templateUrl: './person-list.component.html',
  styles: ``,
})
export class PersonListComponent {
  persons = signal<Person[]>([]);
  loading = signal(false);
  totalRecords = signal(0);
  perPage = signal(10);
  searchTerm = signal('');
  private readonly personService = inject(PersonService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly notification = inject(NotificationService);

  loadPersons(page: number): void {
    this.loading.set(true);
    this.personService.list(page).subscribe({
      next: (res) => {
        this.persons.set(res.data);
        this.totalRecords.set(res.meta.total);
        this.perPage.set(res.meta.per_page);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load persons.');
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: any): void {
    const page = Math.floor(event.first / event.rows) + 1;
    this.loadPersons(page);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  navigateToCreate(): void {
    void this.router.navigate(['/persons/new']);
  }

  navigateToEdit(id: number): void {
    void this.router.navigate(['/persons', id, 'edit']);
  }

  confirmDelete(person: Person): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${person.lastName} ${person.firstName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptIcon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectButtonStyleClass: 'p-button-secondary',
      rejectLabel: 'Cancel',
      accept: () => {
        this.personService.remove(person.id).subscribe({
          next: () => {
            this.notification.success('Person deleted successfully.');
            this.loadPersons(1);
          },
          error: () => this.notification.error('Failed to delete person.'),
        });
      },
    });
  }
}
