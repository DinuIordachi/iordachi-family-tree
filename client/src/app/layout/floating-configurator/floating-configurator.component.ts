import { Component, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { LayoutService } from '../layout.service';
import { AppConfigurator } from '../configurator/configurator.component';

@Component({
  selector: 'app-floating-configurator',
  standalone: true,
  imports: [Button, AppConfigurator],
  templateUrl: './floating-configurator.component.html',
})
export class AppFloatingConfigurator {
  readonly layoutService = inject(LayoutService);
}
