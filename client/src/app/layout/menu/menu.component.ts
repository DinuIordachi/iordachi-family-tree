import { Component } from '@angular/core';
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
  model: MenuItem[] = [
    {
      label: 'Home',
      items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }],
    },
    {
      label: 'Management',
      items: [
        { label: 'Garages', icon: 'pi pi-fw pi-warehouse', routerLink: ['/garages'] },
        { label: 'Persons', icon: 'pi pi-fw pi-users', routerLink: ['/persons'] },
        { label: 'Associations', icon: 'pi pi-fw pi-building', routerLink: ['/associations'] },
      ],
    },
  ];
}
