import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-theme-settings',
  standalone: true,
  imports: [ToggleSwitch, FormsModule],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium">Dark Mode</label>
        <p-toggleswitch [ngModel]="themeService.isDarkMode()"
                        (ngModelChange)="themeService.toggleDarkMode()" />
      </div>

      <div>
        <label class="text-sm font-medium block mb-2">Accent Color</label>
        <div class="flex gap-2">
          @for (color of accentColors; track color) {
            <button (click)="themeService.setAccentColor(color)"
                    [style.background-color]="color"
                    class="w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                    [class.border-white]="themeService.accentColor() === color"
                    [class.border-transparent]="themeService.accentColor() !== color">
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class ThemeSettingsComponent {
  readonly themeService = inject(ThemeService);

  readonly accentColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
  ];
}
