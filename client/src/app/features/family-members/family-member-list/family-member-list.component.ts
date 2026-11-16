import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { FamilyTreeService } from '@app/core/services';
import { FamilyMember } from '@app/core/models';
import { AppTag, AppTagSeverity } from '@app/shared/components';

@Component({
  selector: 'app-family-member-list',
  standalone: true,
  imports: [DatePipe, RouterLink, TableModule, AppTag, Button, IconField, InputIcon, InputText],
  templateUrl: './family-member-list.component.html',
  styleUrl: './family-member-list.component.scss',
})
export class FamilyMemberListComponent {
  private readonly familyTreeService = inject(FamilyTreeService);
  private readonly router = inject(Router);

  readonly members = signal<FamilyMember[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly term = signal('');

  readonly defaultPageSize = 10;

  private readonly table = viewChild.required(Table);
  private readonly termInput$ = new Subject<string>();

  constructor() {
    this.termInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((term) => {
        this.term.set(term.trim());
        // Back to page one; reset() re-fires onLazyLoad with the new term.
        this.table().reset();
      });
  }

  onSearch(value: string): void {
    this.termInput$.next(value);
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.onSearch('');
    input.focus();
  }

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
        term: this.term() || undefined,
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
