import { Component, computed, inject } from '@angular/core';
import { AuthService } from '@app/core/services';
import { AppMenuitem } from './item/menuitem.component';

export interface MenuItem {
  label?: string;
  icon?: string;
  routerLink?: string[];
  items?: MenuItem[];
  separator?: boolean;
  visible?: boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [AppMenuitem],
  templateUrl: './menu.component.html',
})
export class AppMenu {
  private readonly auth = inject(AuthService);

  readonly model = computed<MenuItem[]>(() => [
    {
      label: 'Home',
      items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }],
    },
    {
      label: 'Management',
      items: [
        { label: 'Family Members', icon: 'pi pi-fw pi-users', routerLink: ['/family-members'] },
      ],
    },
    {
      label: 'Administration',
      visible: this.auth.isAdmin(),
      items: [{ label: 'Activity log', icon: 'pi pi-fw pi-history', routerLink: ['/activity'] }],
    },
  ]);
}
