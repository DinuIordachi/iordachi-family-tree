import {
  Component,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { filter, Subscription } from 'rxjs';
import { LayoutService } from '../../layout.service';
import { MenuItem } from '../menu.component';
import { Ripple } from 'primeng/ripple';

@Component({
  selector: 'app-menuitem',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, Ripple],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('children', [
      state('collapsed', style({ height: '0' })),
      state('expanded', style({ height: '*' })),
      transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)')),
    ]),
  ],
  templateUrl: './menuitem.component.html',
})
export class AppMenuitem implements OnInit, OnDestroy {
  @Input() item!: MenuItem;
  @Input() index!: number;
  @Input() root = false;
  @Input() parentKey = '';

  private readonly layoutService = inject(LayoutService);
  private readonly router = inject(Router);
  private routerSub!: Subscription;

  active = false;
  key = '';

  @HostBinding('class.layout-root-menuitem')
  get isRootMenuItem(): boolean {
    return this.root;
  }

  ngOnInit(): void {
    this.key = this.parentKey ? this.parentKey + '-' + this.index : String(this.index);

    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveState();
      });

    this.updateActiveState();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  itemClick(): void {
    if (item_has_children(this.item)) {
      this.active = !this.active;
    } else {
      // Hide mobile menu on item click
      this.layoutService.hideOverlayMenu();
    }
  }

  private updateActiveState(): void {
    if (this.item.routerLink) {
      this.active = this.router.isActive(this.item.routerLink[0], {
        paths: 'subset',
        queryParams: 'ignored',
        matrixParams: 'ignored',
        fragment: 'ignored',
      });
    }

    if (this.item.items) {
      this.active = this.item.items.some((child) => {
        if (child.routerLink) {
          return this.router.isActive(child.routerLink[0], {
            paths: 'subset',
            queryParams: 'ignored',
            matrixParams: 'ignored',
            fragment: 'ignored',
          });
        }
        return false;
      });
    }
  }
}

function item_has_children(item: MenuItem): boolean {
  return !!item.items && item.items.length > 0;
}
