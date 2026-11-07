import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FamilyMember } from '@app/core/models';
import { FamilyTreeService } from '@app/core/services';
import { Subscription } from 'rxjs';
import { EngravedTreeComponent } from './components/engraved-tree.component';
import { MemberPanelComponent } from './components/member-panel.component';

type ViewState = 'loading' | 'error' | 'empty' | 'ready';

/** Public /tree page: loads the family and shows it as an engraved tree. */
@Component({
  selector: 'app-tree',
  imports: [EngravedTreeComponent, MemberPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
})
export class TreeComponent implements OnInit {
  private readonly familyTreeService = inject(FamilyTreeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tree = viewChild(EngravedTreeComponent);
  private request?: Subscription;

  readonly state = signal<ViewState>('loading');
  readonly members = signal<FamilyMember[]>([]);
  readonly selected = signal<FamilyMember | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.familyTreeService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          this.members.set(members);
          this.state.set(members.length ? 'ready' : 'empty');
        },
        error: () => this.state.set('error'),
      });
  }

  zoomIn(): void {
    this.tree()?.zoomBy(1.25);
  }

  zoomOut(): void {
    this.tree()?.zoomBy(0.8);
  }

  resetView(): void {
    this.tree()?.resetView();
  }

  onPanelClosed(): void {
    const id = this.selected()?.id;
    this.selected.set(null);
    if (!id) {
      return;
    }
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<SVGGElement>(`g[etMedallion][data-member-id="${id}"]`)?.focus();
      },
      { injector: this.injector },
    );
  }
}
