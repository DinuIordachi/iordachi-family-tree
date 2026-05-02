import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ConfirmDialogComponent } from '@app/shared/components';
import { GarageService, NotificationService } from '@app/core/services';
import { Garage } from '@app/core/models';
import { GarageStatus } from '@app/core/enums';

@Component({
  selector: 'app-garage-list',
  standalone: true,
  imports: [TableModule, Button, InputText, Tag, IconField, InputIcon, ConfirmDialogComponent],
  providers: [ConfirmationService],
  templateUrl: './garage-list.component.html',
  styles: ``,
})
export class GarageListComponent {
  garages = signal<Garage[]>([]);
  loading = signal(false);
  totalRecords = signal(0);
  perPage = signal(10);
  searchTerm = signal('');
  private readonly garageService = inject(GarageService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly notification = inject(NotificationService);

  loadGarages(page: number): void {
    this.loading.set(true);
    this.garageService.list(page).subscribe({
      next: (res) => {
        this.garages.set(res.data);
        this.totalRecords.set(res.meta.total);
        this.perPage.set(res.meta.per_page);
        this.loading.set(false);
      },
      error: () => {
        this.notification.error('Failed to load garages.');
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: any): void {
    const page = Math.floor(event.first / event.rows) + 1;
    this.loadGarages(page);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  navigateToCreate(): void {
    this.router.navigate(['/garages/new']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/garages', id, 'edit']);
  }

  confirmDelete(garage: Garage): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete garage "${garage.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptIcon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectButtonStyleClass: 'p-button-secondary',
      rejectLabel: 'Cancel',
      accept: () => {
        this.garageService.remove(garage.id).subscribe({
          next: () => {
            this.notification.success('Garage deleted successfully.');
            this.loadGarages(1);
          },
          error: () => this.notification.error('Failed to delete garage.'),
        });
      },
    });
  }

  formatStatus(status: GarageStatus): string {
    switch (status) {
      case GarageStatus.NORMAL:
        return 'Normal';
      case GarageStatus.SEIZED_BY_STATE:
        return 'Seized';
      case GarageStatus.UNDER_STATE_INVESTIGATION:
        return 'Investigation';
      default:
        return status;
    }
  }

  getStatusSeverity(status: GarageStatus): 'success' | 'danger' | 'warn' | 'info' {
    switch (status) {
      case GarageStatus.NORMAL:
        return 'success';
      case GarageStatus.SEIZED_BY_STATE:
        return 'danger';
      case GarageStatus.UNDER_STATE_INVESTIGATION:
        return 'warn';
      default:
        return 'info';
    }
  }
}
