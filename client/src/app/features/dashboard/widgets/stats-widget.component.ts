import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-stats-widget',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'contents' },
  templateUrl: './stats-widget.component.html'
})
export class StatsWidgetComponent {
  readonly label = input.required<string>();
  readonly count = input.required<number | null>();
  readonly icon = input.required<string>();
  readonly iconColor = input.required<string>();
  readonly iconBgClass = input.required<string>();
  readonly link = input.required<string>();
}
