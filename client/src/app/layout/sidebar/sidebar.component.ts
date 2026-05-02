import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LayoutService } from '../layout.service';
import { AppMenu } from '../menu/menu.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AppMenu],
  templateUrl: './sidebar.component.html',
})
export class AppSidebar implements OnInit, OnDestroy {
  readonly layoutService = inject(LayoutService);
  private readonly router = inject(Router);
  private routerSub!: Subscription;

  @ViewChild('layoutSidebar') layoutSidebar!: ElementRef;

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.layoutService.hideOverlayMenu();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
