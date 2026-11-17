import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Table, TableModule, TableLazyLoadEvent } from 'primeng/table';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { ActivityService } from '@app/core/services';
import { Activity, ActivityFilterOptions } from '@app/core/models';
import { AppTag } from '@app/shared/components';
import { HighlightPipe } from '@app/shared/pipes/highlight.pipe';
import {
  causerName,
  displayValue,
  eventSeverity,
  extraProperties,
  fromIsoDate,
  humanize,
  toIsoDate,
} from './activity-format';

interface Option<T> {
  label: string;
  value: T;
}

/** Admin-only audit report: who did what, when, and what changed. */
@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TableModule,
    IconField,
    InputIcon,
    InputText,
    Button,
    Select,
    DatePicker,
    AppTag,
    HighlightPipe,
  ],
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.scss',
})
export class ActivityLogComponent {
  private readonly activityService = inject(ActivityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly pageSize = 25;

  readonly rows = signal<Activity[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly first = signal(0);

  readonly term = signal('');
  readonly causerId = signal<number | null>(null);
  readonly event = signal<string | null>(null);
  readonly subjectType = signal<string | null>(null);
  readonly dateRange = signal<Date[] | null>(null);

  readonly options = signal<ActivityFilterOptions>({ events: [], logNames: [], subjectTypes: [], causers: [] });
  readonly causerOptions = computed<Option<number>[]>(() =>
    this.options().causers.map((c) => ({ label: `${c.name} (${c.email})`, value: c.id })),
  );
  readonly eventOptions = computed<Option<string>[]>(() =>
    this.options().events.map((e) => ({ label: humanize(e), value: e })),
  );
  readonly subjectTypeOptions = computed<Option<string>[]>(() =>
    this.options().subjectTypes.map((t) => ({ label: humanize(t), value: t })),
  );
  readonly hasFilters = computed(
    () => !!(this.term() || this.causerId() || this.event() || this.subjectType() || this.dateRange()?.length),
  );

  readonly causerName = causerName;
  readonly displayValue = displayValue;
  readonly eventSeverity = eventSeverity;
  readonly extraProperties = extraProperties;
  readonly humanize = humanize;

  private readonly table = viewChild.required(Table);
  private readonly termInput$ = new Subject<string>();

  constructor() {
    this.restoreFromUrl();

    this.activityService.filters().subscribe({ next: (o) => this.options.set(o) });

    this.termInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((term) => {
        this.term.set(term.trim());
        this.applyFilters();
      });
  }

  onSearch(value: string): void {
    this.termInput$.next(value);
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.termInput$.next('');
    input.focus();
  }

  onDateRange(range: Date[] | null): void {
    this.dateRange.set(range);
    // Wait for the second date of a range before querying.
    if (!range || range.length === 0 || range[1] || !range[0]) {
      this.applyFilters();
    }
  }

  resetFilters(input: HTMLInputElement): void {
    input.value = '';
    this.term.set('');
    this.causerId.set(null);
    this.event.set(null);
    this.subjectType.set(null);
    this.dateRange.set(null);
    this.applyFilters();
  }

  /** Back to page one with the current filters; reset() re-fires onLazyLoad. */
  applyFilters(): void {
    this.first.set(0);
    this.table().reset();
  }

  loadPage(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize;
    const page = Math.floor(first / rows) + 1;
    this.first.set(first);
    this.loading.set(true);

    const [from, to] = this.dateRange() ?? [];
    const query = {
      page,
      pageSize: rows,
      orderDirection: 'desc' as const,
      term: this.term() || undefined,
      causerId: this.causerId() ?? undefined,
      event: this.event() ?? undefined,
      subjectType: this.subjectType() ?? undefined,
      dateFrom: toIsoDate(from),
      dateTo: toIsoDate(to ?? from),
    };
    this.syncUrl(query);

    this.activityService.paginate(query).subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.total.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private restoreFromUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    this.term.set(q.get('term') ?? '');
    this.causerId.set(q.get('causerId') ? Number(q.get('causerId')) : null);
    this.event.set(q.get('event'));
    this.subjectType.set(q.get('subjectType'));
    const from = fromIsoDate(q.get('dateFrom'));
    const to = fromIsoDate(q.get('dateTo'));
    this.dateRange.set(from ? (to ? [from, to] : [from]) : null);
    const page = Number(q.get('page') ?? 1);
    this.first.set(page > 1 ? (page - 1) * this.pageSize : 0);
  }

  private syncUrl(query: Record<string, string | number | undefined>): void {
    const { pageSize: _size, orderDirection: _dir, ...rest } = query;
    const queryParams = Object.fromEntries(
      Object.entries({ ...rest, page: query['page'] === 1 ? undefined : query['page'] }).map(([k, v]) => [
        k,
        v === undefined || v === '' ? null : v,
      ]),
    );
    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }
}
