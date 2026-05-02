import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppConfigurator, LayoutService } from '@app/layout';
import { AuthService } from '@app/core/services';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, AppConfigurator],
  templateUrl: './topbar.component.html',
})
export class AppTopbar {
  readonly layoutService = inject(LayoutService);
  readonly auth = inject(AuthService);
}
