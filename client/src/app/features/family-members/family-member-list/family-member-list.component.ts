import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button } from 'primeng/button';
import { FamilyTreeService } from '@app/core/services';
import { FamilyMember } from '@app/core/models';
import { AppTag, AppTagSeverity } from '@app/shared/components';

@Component({
  selector: 'app-family-member-list',
  standalone: true,
  imports: [DatePipe, RouterLink, TableModule, AppTag, Button],
  templateUrl: './family-member-list.component.html',
  styleUrl: './family-member-list.component.scss',
})
export class FamilyMemberListComponent {
  private readonly familyTreeService = inject(FamilyTreeService);
  private readonly router = inject(Router);

  readonly members = signal<FamilyMember[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly defaultPageSize = 10;

  loadPage(event: TableLazyLoadEvent): void {
    this.loading.set(true);

    const first = event.first ?? 0;
    const rows = event.rows ?? this.defaultPageSize;
    const page = Math.floor(first / rows) + 1;

    const sortField = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;

    this.familyTreeService
      .paginate({
        page,
        pageSize: rows,
        orderBy: this.mapSortField(sortField),
        orderDirection: event.sortOrder === 1 ? 'asc' : 'desc',
      })
      .subscribe({
        next: (res) => {
          this.members.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openEdit(member: FamilyMember): void {
    this.router.navigate(['/family-members', member.id, 'edit']);
  }

  genderLabel(member: FamilyMember): string {
    return member.data.gender === 'M' ? 'Male' : member.data.gender === 'F' ? 'Female' : '—';
  }

  genderSeverity(member: FamilyMember): AppTagSeverity {
    return member.data.gender === 'M' ? 'info' : member.data.gender === 'F' ? 'pink' : 'secondary';
  }

  private mapSortField(field?: string | null): 'firstName' | 'lastName' | 'birthdate' | 'createdAt' | undefined {
    switch (field) {
      case 'data.first name':
      case 'firstName':
        return 'firstName';
      case 'data.last name':
      case 'lastName':
        return 'lastName';
      case 'data.birthday':
      case 'birthdate':
        return 'birthdate';
      default:
        return 'createdAt';
    }
  }
}
