import { Component, computed, effect, inject, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { AppFooter, AppSidebar, AppTopbar, LayoutService } from '@app/layout';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Toast, ConfirmDialog, AppTopbar, AppSidebar, AppFooter],
  templateUrl: './layout.component.html',
})
export class AppLayout {
  readonly layoutService = inject(LayoutService);
  containerClass = computed(() => {
    const config = this.layoutService.layoutConfig();
    const state = this.layoutService.layoutState();
    return {
      'layout-overlay': config.menuMode === 'overlay',
      'layout-static': config.menuMode === 'static',
      'layout-static-inactive': state.staticMenuDesktopInactive && config.menuMode === 'static',
      'layout-overlay-active': state.overlayMenuActive,
      'layout-mobile-active': state.staticMenuMobileActive,
      'p-input-filled': false,
      'p-ripple-disabled': false,
    };
  });
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      if (this.layoutService.layoutState().staticMenuMobileActive) {
        this.blockBodyScroll();
      } else {
        this.unblockBodyScroll();
      }
    });
  }

  private blockBodyScroll(): void {
    this.renderer.addClass(this.document.body, 'blocked-scroll');
  }

  private unblockBodyScroll(): void {
    this.renderer.removeClass(this.document.body, 'blocked-scroll');
  }
}
