import { Injectable, inject, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly isDarkMode = signal<boolean>(false);
  readonly accentColor = signal<string>('#6366f1');
  readonly backgroundColor = signal<string>('#ffffff');

  constructor() {
    this.loadFromStorage();
    this.applyTheme();

    effect(() => {
      const dark = this.isDarkMode();
      const accent = this.accentColor();
      const bg = this.backgroundColor();

      this.persistToStorage(dark, accent, bg);
    });
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(v => !v);
    this.applyTheme();
  }

  setAccentColor(color: string): void {
    this.accentColor.set(color);
    this.applyAccentColor(color);
  }

  setBackgroundColor(color: string): void {
    this.backgroundColor.set(color);
    this.applyBackgroundColor(color);
  }

  private applyTheme(): void {
    const root = this.document.documentElement;
    if (this.isDarkMode()) {
      root.classList.add('dark');
      if (this.backgroundColor() === '#ffffff') {
        this.backgroundColor.set('#0b1220');
      }
    } else {
      root.classList.remove('dark');
      if (this.backgroundColor() === '#0b1220') {
        this.backgroundColor.set('#ffffff');
      }
    }
    this.applyAccentColor(this.accentColor());
    this.applyBackgroundColor(this.backgroundColor());
  }

  private applyAccentColor(color: string): void {
    this.document.documentElement.style.setProperty('--p-primary-color', color);
  }

  private applyBackgroundColor(color: string): void {
    this.document.documentElement.style.setProperty('--app-bg', color);
  }

  private loadFromStorage(): void {
    const dark = localStorage.getItem('theme_dark');
    const accent = localStorage.getItem('theme_accent');
    const bg = localStorage.getItem('theme_bg');

    if (dark !== null) this.isDarkMode.set(dark === 'true');
    if (accent) this.accentColor.set(accent);
    if (bg) this.backgroundColor.set(bg);
  }

  private persistToStorage(dark: boolean, accent: string, bg: string): void {
    localStorage.setItem('theme_dark', String(dark));
    localStorage.setItem('theme_accent', accent);
    localStorage.setItem('theme_bg', bg);
  }
}
