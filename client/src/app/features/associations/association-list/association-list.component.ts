import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ConfirmDialogComponent } from '@app/shared/components';
import { AssociationService, NotificationService } from '@app/core/services';
import { Association } from '@app/core/models';

@Component({
  selector: 'app-association-list',
  standalone: true,
  imports: [TableModule, Button, InputText, IconField, InputIcon, ConfirmDialogComponent],
  providers: [ConfirmationService],
  templateUrl: './association-list.component.html',
  styles: ``,
})
export class AssociationListComponent {
  private readonly associationService = inject(AssociationService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly notification = inject(NotificationService);

  associations = signal<Association[]>([]);
  loading = signal(false);
  totalRecords = signal(0);
  perPage = signal(10);
  searchTerm = signal('');

  loadAssociations(page: number): void {
    this.loading.set(true);
    this.associationService.list(page).subscribe({
      next: (res) => {
        this.associations.set(res.data);
        this.totalRecords.set(res.meta.total);
        this.perPage.set(res.meta.per_page);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load associations.');
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: any): void {
    const page = Math.floor(event.first / event.rows) + 1;
    this.loadAssociations(page);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  navigateToCreate(): void {
    void this.router.navigate(['/associations/new']);
  }

  navigateToEdit(id: number): void {
    void this.router.navigate(['/associations', id, 'edit']);
  }

  confirmDelete(assoc: Association): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete association "${assoc.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.associationService.remove(assoc.id).subscribe({
          next: () => {
            this.notification.success('Association deleted successfully.');
            this.loadAssociations(1);
          },
          error: () => this.notification.error('Failed to delete association.'),
        });
      },
    });
  }
}
