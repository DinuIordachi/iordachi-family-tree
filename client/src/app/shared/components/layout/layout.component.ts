import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button, Drawer, Toast],
  template: `
    <p-toast />
    <div class="flex h-screen">
      <!-- Desktop sidebar -->
      <aside
        class="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 p-4">
        <div class="text-xl font-bold mb-8 px-2">Garage Manager</div>
        <nav class="flex flex-col gap-1">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
               class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>

      <!-- Mobile drawer -->
      <p-drawer [(visible)]="sidebarVisible" [modal]="true">
        <ng-template #header>
          <span class="text-xl font-bold">Garage Manager</span>
        </ng-template>
        <nav class="flex flex-col gap-1">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-primary-100 dark:bg-primary-900"
               (click)="sidebarVisible.set(false)"
               class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </p-drawer>

      <!-- Main content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Top bar -->
        <header
          class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
          <div class="flex items-center gap-3">
            <p-button icon="pi pi-bars" [text]="true" class="md:hidden" (onClick)="sidebarVisible.set(true)" />
            <span class="text-lg font-semibold md:hidden">Garage Manager</span>
          </div>
          <div class="flex items-center gap-2">
            @if (auth.currentUser()) {
              <span class="text-sm hidden sm:inline">{{ auth.currentUser()?.firstName }}</span>
            }
            <p-button [icon]="themeService.isDarkMode() ? 'pi pi-sun' : 'pi pi-moon'"
                      [text]="true" [rounded]="true"
                      (onClick)="themeService.toggleDarkMode()" />
            <p-button icon="pi pi-sign-out" [text]="true" [rounded]="true"
                      severity="danger" (onClick)="auth.logout()" />
          </div>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-auto p-4 md:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: ``
})
export class LayoutComponent {
  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly sidebarVisible = signal(false);

  readonly navItems = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'Garages', icon: 'pi pi-warehouse', route: '/garages' },
    { label: 'Persons', icon: 'pi pi-users', route: '/persons' },
    { label: 'Associations', icon: 'pi pi-building', route: '/associations' }
  ];
}
