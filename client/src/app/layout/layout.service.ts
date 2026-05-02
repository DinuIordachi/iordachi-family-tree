import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | null;
    darkTheme: boolean;
    menuMode: string;
}

export interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    staticMenuMobileActive: boolean;
    menuHoverActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
    private readonly document = inject(DOCUMENT);

    private readonly _layoutConfig = signal<LayoutConfig>({
        preset: 'Aura',
        primary: 'emerald',
        surface: null,
        darkTheme: true,
        menuMode: 'static'
    });

    private readonly _layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false
    });

    layoutConfig = this._layoutConfig.asReadonly();

    layoutState = this._layoutState.asReadonly();

    isDarkTheme = computed(() => this._layoutConfig().darkTheme);

    isOverlay = computed(() => this._layoutConfig().menuMode === 'overlay');

    isDesktop = computed(() => {
        if (typeof window === 'undefined') return true;
        return window.innerWidth > 991;
    });

    isSidebarActive = computed(() => {
        if (this.isOverlay()) {
            return this._layoutState().overlayMenuActive;
        }
        if (this.isDesktop()) {
            return !this._layoutState().staticMenuDesktopInactive;
        }
        return this._layoutState().staticMenuMobileActive;
    });

    constructor() {
        this.restoreConfig();

        effect(() => {
            const config = this._layoutConfig();
            localStorage.setItem('layout-config', JSON.stringify(config));
        });
    }

    updateLayoutConfig(key: keyof LayoutConfig, value: any): void {
        this._layoutConfig.update(config => ({
            ...config,
            [key]: value
        }));
    }

    updateLayoutState(key: keyof LayoutState, value: any): void {
        this._layoutState.update(state => ({
            ...state,
            [key]: value
        }));
    }

    onMenuToggle(): void {
        if (this.isOverlay()) {
            this._layoutState.update(state => ({
                ...state,
                overlayMenuActive: !state.overlayMenuActive
            }));
        } else {
            if (this.isDesktop()) {
                this._layoutState.update(state => ({
                    ...state,
                    staticMenuDesktopInactive: !state.staticMenuDesktopInactive
                }));
            } else {
                this._layoutState.update(state => ({
                    ...state,
                    staticMenuMobileActive: !state.staticMenuMobileActive
                }));
            }
        }
    }

    showConfigSidebar(): void {
        this._layoutState.update(state => ({
            ...state,
            configSidebarVisible: true
        }));
    }

    hideConfigSidebar(): void {
        this._layoutState.update(state => ({
            ...state,
            configSidebarVisible: false
        }));
    }

    hideOverlayMenu(): void {
        this._layoutState.update(state => ({
            ...state,
            overlayMenuActive: false,
            staticMenuMobileActive: false
        }));
    }

    toggleDarkMode(): void {
        const newDarkTheme = !this._layoutConfig().darkTheme;

        if ((this.document as any).startViewTransition) {
            this.handleDarkModeTransition(newDarkTheme);
        } else {
            this.applyDarkMode(newDarkTheme);
        }
    }

    handleDarkModeTransition(newDarkTheme: boolean): void {
        const transition = (this.document as any).startViewTransition(() => {
            this.applyDarkMode(newDarkTheme);
        });
    }

    private applyDarkMode(newDarkTheme: boolean): void {
        this._layoutConfig.update(config => ({
            ...config,
            darkTheme: newDarkTheme
        }));
        const element = this.document.documentElement;
        if (newDarkTheme) {
            element.classList.add('app-dark');
        } else {
            element.classList.remove('app-dark');
        }
    }

    private restoreConfig(): void {
        const stored = localStorage.getItem('layout-config');
        if (stored) {
            try {
                this._layoutConfig.set(JSON.parse(stored) as LayoutConfig);
            } catch {
                // ignore invalid stored config
            }
        }

        this.document.documentElement.classList.toggle('app-dark', this._layoutConfig().darkTheme);
    }
}
