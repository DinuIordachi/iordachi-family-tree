import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ActivityService } from '@app/core/services';
import { Activity } from '@app/core/models';
import { AppTag } from '@app/shared/components';
import { causerName, eventSeverity, humanize } from '../../activity/activity-format';

/** Admin dashboard card: the latest few activity log entries. */
@Component({
  selector: 'app-recent-activity-widget',
  standalone: true,
  imports: [RouterLink, DatePipe, AppTag],
  templateUrl: './recent-activity-widget.component.html',
  host: { class: 'col-span-12' },
})
export class RecentActivityWidgetComponent implements OnInit {
  private readonly activityService = inject(ActivityService);

  readonly items = signal<Activity[] | null>(null);

  readonly causerName = causerName;
  readonly eventSeverity = eventSeverity;
  readonly humanize = humanize;

  ngOnInit(): void {
    this.activityService.paginate({ pageSize: 8 }).subscribe({
      next: (res) => this.items.set(res.data),
      error: () => this.items.set([]),
    });
  }
}
