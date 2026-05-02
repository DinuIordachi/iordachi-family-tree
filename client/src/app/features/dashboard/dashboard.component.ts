import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, FamilyTreeService } from '@app/core/services';
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
  private readonly familyTreeService = inject(FamilyTreeService);

  familyMemberCount = signal<number | null>(null);

  ngOnInit(): void {
    this.familyTreeService.list().subscribe({
      next: (members) => this.familyMemberCount.set(members.length),
      error: () => this.familyMemberCount.set(0),
    });
  }
}
