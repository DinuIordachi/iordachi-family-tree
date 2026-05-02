import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { AuthService } from '@app/core/services';
import { ApiService } from '@app/core/services';
import { PaginatedResponse } from '@app/core/models';
import { Button } from 'primeng/button';
import { StatsWidgetComponent } from './widgets/stats-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, Button, StatsWidgetComponent],
  templateUrl: './dashboard.component.html',
  styles: ``,
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  garageCount = signal<number | null>(null);
  personCount = signal<number | null>(null);
  associationCount = signal<number | null>(null);

  ngOnInit(): void {
    this.loadCounts();
  }

  private loadCounts(): void {
    const params = new HttpParams().set('page', 1).set('per_page', 1);

    this.api.get<PaginatedResponse<unknown>>('/garages', params).subscribe({
      next: (res) => this.garageCount.set(res.meta.total),
      error: () => this.garageCount.set(0),
    });

    this.api.get<PaginatedResponse<unknown>>('/persons', params).subscribe({
      next: (res) => this.personCount.set(res.meta.total),
      error: () => this.personCount.set(0),
    });

    this.api.get<PaginatedResponse<unknown>>('/associations', params).subscribe({
      next: (res) => this.associationCount.set(res.meta.total),
      error: () => this.associationCount.set(0),
    });
  }
}
