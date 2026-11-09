import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { select } from 'd3-selection';
import { ZoomBehavior, zoom, zoomIdentity } from 'd3-zoom';
import 'd3-transition';
import { FamilyMember } from '@app/core/models';
import { FamilyTreeService } from '@app/core/services';
import { GEOMETRY, LifeMotif, MOTIFS, MotifKind, PALETTE, layoutLife, lineageOf } from './life-layout';
import { LifeMotifComponent } from './life-motif.component';
import { LifePanelComponent } from './life-panel.component';

type ViewState = 'loading' | 'error' | 'empty' | 'ready';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;700&display=swap';

/** What each generation's element stands for, after the guide's symbol sheet. */
const MOTIF_MEANING: Record<MotifKind, string> = {
  basil: 'Basil — protection, constant love',
  glass: 'Wine glasses — celebration, conversation',
  fruit: 'Fruit — orchards, the harvest',
  connectivity: 'Connectivity — the connected age',
  star: 'Flower — beauty and family',
  chip: 'Energy — moving forward',
  textile: 'Textile — craft from old traditions',
  heart: 'Heart — devotion',
};

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Public /tree-of-life page: the family drawn in the visual language of
 * the "Meet, Moldova" Tree of Life — black ground, the eight-colour palette,
 * flat folk elements on 45° circuit branches, Circe Light/Bold typography.
 */
@Component({
  selector: 'app-tree-of-life',
  imports: [LifeMotifComponent, LifePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree-of-life.component.html',
  styleUrl: './tree-of-life.component.scss',
  host: { '(document:keydown.escape)': 'selected.set(null)' },
})
export class TreeOfLifeComponent implements OnInit {
  private readonly service = inject(FamilyTreeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly svg = viewChild<ElementRef<SVGSVGElement>>('canvas');
  private readonly viewport = viewChild<ElementRef<SVGGElement>>('viewport');
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;

  readonly state = signal<ViewState>('loading');
  readonly members = signal<FamilyMember[]>([]);
  readonly selected = signal<FamilyMember | null>(null);
  readonly hovered = signal<string | null>(null);

  readonly layout = computed(() => layoutLife(this.members()));
  readonly g = GEOMETRY;
  readonly palette = PALETTE;

  /** Ids lit by hover (or by the open member when nothing is hovered). */
  readonly lit = computed<Set<string> | null>(() => {
    const id = this.hovered() ?? this.selected()?.id ?? null;
    return id ? lineageOf(id, this.members()) : null;
  });

  readonly legend = computed(() =>
    Array.from({ length: this.layout().generations }, (_, i) => {
      const kind = MOTIFS[i % MOTIFS.length];
      return { kind, numeral: ROMAN[i] ?? String(i + 1), meaning: MOTIF_MEANING[kind] };
    }),
  );

  readonly girdleSpan = computed(() => {
    const b = this.layout().bounds;
    return { x: b.minX - 400, width: b.maxX - b.minX + 800 };
  });

  ngOnInit(): void {
    this.loadFont();
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          this.members.set(members);
          this.state.set(members.length ? 'ready' : 'empty');
          afterNextRender(() => this.initZoom(), { injector: this.injectorRef });
        },
        error: () => this.state.set('error'),
      });
  }

  private readonly injectorRef = inject(Injector);

  isLit(ids: string[]): boolean {
    const lit = this.lit();
    return !lit || ids.some((id) => lit.has(id));
  }

  branchLit(parentIds: string[], childId: string): boolean {
    const lit = this.lit();
    return !lit || (lit.has(childId) && parentIds.some((id) => lit.has(id)));
  }

  label(m: FamilyMember): { first: string; rest: string } {
    const born = m.data.birthday?.slice(0, 4);
    const died = m.diedAt?.slice(0, 4);
    const years = born || died ? `${born ?? '?'}${m.deceased ? ` – ${died ?? '?'}` : ''}` : m.deceased ? '†' : '';
    const rest = [m.data['last name'], years].filter(Boolean).join(' · ');
    return { first: m.data['first name'], rest };
  }

  ariaLabel(motif: LifeMotif): string {
    const m = motif.member;
    const name = [m.data['first name'], m.data['last name']].filter(Boolean).join(' ');
    return `${name}${m.deceased ? ', deceased' : ''}, generation ${motif.gen + 1}`;
  }

  activate(member: FamilyMember): void {
    this.selected.set(this.selected()?.id === member.id ? null : member);
  }

  selectById(id: string): void {
    const m = this.members().find((x) => x.id === id);
    if (!m) return;
    this.selected.set(m);
    const motif = this.layout().motifs.find((x) => x.id === id);
    const svg = this.svg()?.nativeElement;
    if (motif && svg && this.zoomBehavior) {
      const { width, height } = svg.getBoundingClientRect();
      const k = Math.max(0.9, this.currentScale);
      const t = zoomIdentity.translate(width * 0.38 - motif.x * k, height / 2 - motif.y * k).scale(k);
      select(svg).transition().duration(this.reducedMotion ? 0 : 650).call(this.zoomBehavior.transform, t);
    }
  }

  zoomBy(factor: number): void {
    const svg = this.svg()?.nativeElement;
    if (svg && this.zoomBehavior) select(svg).transition().duration(250).call(this.zoomBehavior.scaleBy, factor);
  }

  resetView(animate = true): void {
    const svg = this.svg()?.nativeElement;
    if (!svg || !this.zoomBehavior) return;
    const { width, height } = svg.getBoundingClientRect();
    const b = this.layout().bounds;
    const pad = width < 700 ? 24 : 72;
    const top = width < 700 ? 150 : 40;
    const fitHeight = (height - top - pad) / (b.maxY - b.minY);
    const narrow = width < 700;
    // Phones: keep names legible and centre on the stem; the crown pans sideways.
    const k = narrow
      ? Math.min(fitHeight, 0.55)
      : Math.min((width - pad * 2) / (b.maxX - b.minX), fitHeight, 1.2);
    const cx = narrow ? 0 : (b.minX + b.maxX) / 2;
    const t = zoomIdentity
      .translate(width / 2 - cx * k, top + (height - top - pad) / 2 - ((b.minY + b.maxY) / 2) * k)
      .scale(k);
    const sel = select(svg);
    if (animate && !this.reducedMotion) sel.transition().duration(500).call(this.zoomBehavior.transform, t);
    else sel.call(this.zoomBehavior.transform, t);
  }

  private currentScale = 1;

  private get reducedMotion(): boolean {
    return this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private initZoom(): void {
    const svg = this.svg()?.nativeElement;
    const vp = this.viewport()?.nativeElement;
    if (!svg || !vp || this.zoomBehavior) return;
    this.zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', (e) => {
        this.currentScale = e.transform.k;
        vp.setAttribute('transform', e.transform.toString());
      });
    select(svg).call(this.zoomBehavior).on('dblclick.zoom', null);
    this.resetView(false);
  }

  private loadFont(): void {
    if (this.document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    this.document.head.appendChild(link);
  }
}
