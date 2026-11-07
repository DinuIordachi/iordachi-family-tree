import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FamilyMember } from '@app/core/models';
import { select } from 'd3-selection';
import { curveBasisClosed, line } from 'd3-shape';
import { ZoomBehavior, ZoomTransform, zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { branchPath, branchWidths, rootsPath, trunkPath } from '../engraving/branch-geometry';
import { buildHouseholds } from '../engraving/households';
import { DEFAULT_LAYOUT_OPTIONS, layoutTree } from '../engraving/layout';
import { lineageBranchIds } from '../engraving/lineage';
import { bannerSpan, fullName } from '../engraving/member-text';
import { FIXED_MOTIFS, placeMotifs } from '../engraving/motif-placement';
import { hashSeed } from '../engraving/seeded-random';
import { MotifPlacement, Point, TreeLayout } from '../engraving/types';
import { EngravingDefsComponent } from './engraving-defs.component';
import { MedallionComponent } from './medallion.component';
import { MotifComponent } from './motif.component';

const SCALE_EXTENT: [number, number] = [0.25, 2.5];
const CROWN_PAD = 80;
const FALLBACK_VIEWPORT = { width: 1200, height: 800 };
/** Person slots widen (up to this cap) so the longest name's banner never touches its neighbours. */
const MAX_PERSON_GAP = 280;
const FOCUS_MARGIN = 80;
const ALII_LINE = 20;
/** Medallion rim plus laurel ring: a couple's cord runs between these on each side. */
const MEDALLION_REACH = 46;
/** Spec §5: --et-dur-grow (1600ms) plus one 300ms stagger per generation after the first. */
const GROW_MS = 1600;
const STAGGER_MS = 300;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Convex hull (monotone chain) of points padded into circles, for the foliage mass. */
function crownPath(layout: TreeLayout): string {
  if (!layout.members.length) {
    return '';
  }
  const pts: [number, number][] = [];
  for (const m of layout.members) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push([m.center.x + Math.cos(a) * CROWN_PAD, m.center.y + Math.sin(a) * (CROWN_PAD + 20)]);
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return line().curve(curveBasisClosed)(hull) ?? '';
}

/** Generation a motif appears with: the eagle last, ground motifs first, ornaments with their branch. */
function motifGeneration(p: MotifPlacement, layout: TreeLayout): number {
  if (p.motif === 'eagle-cross') {
    return layout.generationCount;
  }
  if (FIXED_MOTIFS.includes(p.motif)) {
    return 0;
  }
  const g = Math.round((layout.trunk.top.y - p.center.y) / DEFAULT_LAYOUT_OPTIONS.generationSpacing);
  return Math.max(0, Math.min(Math.max(0, layout.generationCount - 1), g));
}

/** The engraved SVG family tree: trunk, branches, medallions and Moldovan motifs, with pan/zoom. */
@Component({
  selector: 'et-engraved-tree',
  imports: [EngravingDefsComponent, MedallionComponent, MotifComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './engraved-tree.component.html',
  styleUrl: './engraved-tree.component.scss',
})
export class EngravedTreeComponent {
  readonly members = input.required<FamilyMember[]>();
  readonly selectedId = input<string | null>(null);
  readonly memberActivate = output<FamilyMember>();

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly viewportRef = viewChild.required<ElementRef<SVGGElement>>('viewport');
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly growth = signal<'growing' | 'grown'>(prefersReducedMotion() ? 'grown' : 'growing');

  protected readonly personGap = computed(() => {
    const widest = Math.max(0, ...this.members().map((m) => bannerSpan(fullName(m)) + 10));
    return Math.min(MAX_PERSON_GAP, Math.max(DEFAULT_LAYOUT_OPTIONS.personGap, widest));
  });
  protected readonly layout = computed(() =>
    layoutTree(buildHouseholds(this.members()), { personGap: this.personGap() }),
  );
  protected readonly motifs = computed(() => {
    const layout = this.layout();
    return placeMotifs(layout, hashSeed('iordachi'), this.personGap() / 2).map((placement) => ({
      placement,
      generation: motifGeneration(placement, layout),
    }));
  });
  private readonly byId = computed(() => new Map(this.members().map((m) => [m.id, m])));

  protected readonly placedMembers = computed(() =>
    this.layout().members.map((p) => ({ ...p, member: this.byId().get(p.id)! })),
  );
  protected readonly branches = computed(() => {
    const forks = new Set(this.layout().branches.map((b) => b.parentHouseholdId));
    return this.layout().branches.map((b) => ({
      id: b.id,
      generation: b.generation,
      d: branchPath(b, forks.has(b.childHouseholdId) ? branchWidths(b.generation + 1).start : undefined),
    }));
  });
  protected readonly trunkD = computed(() => trunkPath(this.layout().trunk));
  protected readonly rootsD = computed(() => rootsPath(this.layout().trunk.base, hashSeed('roots')));
  protected readonly crownD = computed(() => crownPath(this.layout()));
  protected readonly lineage = computed(() => {
    const id = this.hoveredId();
    return new Set(id ? lineageBranchIds(id, this.layout()) : []);
  });
  protected readonly unplaced = computed(() =>
    this.layout().unplacedMemberIds.map((id) => ({ id, member: this.byId().get(id)!, name: fullName(this.byId().get(id)!) })),
  );
  /** One knot between each pair of neighbouring spouses, with a cord from rim to rim. */
  protected readonly knots = computed(() => {
    const knots: Point[] = [];
    const members = this.layout().members;
    for (let i = 1; i < members.length; i++) {
      const [a, b] = [members[i - 1], members[i]];
      if (a.householdId === b.householdId) {
        knots.push({ x: (a.center.x + b.center.x) / 2, y: a.center.y });
      }
    }
    return knots;
  });
  protected readonly cordHalf = computed(() => Math.max(0, this.personGap() / 2 - MEDALLION_REACH));

  protected readonly ground = computed(() => {
    const { bounds, trunk } = this.layout();
    const minX = Math.min(bounds.minX, trunk.base.x - 330) - 300;
    const maxX = Math.max(bounds.maxX, trunk.base.x + 330) + 300;
    return { x: minX, y: trunk.base.y, width: maxX - minX };
  });
  protected readonly titleAt = computed<Point>(() => ({
    x: this.layout().trunk.base.x,
    y: this.layout().bounds.minY - 290,
  }));
  /** The Alii list grows upward from just above the ground, so a long list never sinks into the river. */
  protected readonly aliiAt = computed<Point>(() => ({
    x: Math.max(this.layout().bounds.maxX, this.layout().trunk.base.x + 330) + 120,
    y: this.layout().trunk.base.y - 40 - this.unplaced().length * ALII_LINE,
  }));

  /** World-space box that must fit the viewport. */
  private readonly contentBox = computed(() => {
    const { bounds, trunk } = this.layout();
    const minX = Math.min(bounds.minX - 110, trunk.base.x - 340);
    const hasAlii = this.unplaced().length > 0;
    const maxX = Math.max(bounds.maxX + 110, trunk.base.x + 340, hasAlii ? this.aliiAt().x + 220 : -Infinity);
    const minY = Math.min(this.titleAt().y - 50, hasAlii ? this.aliiAt().y - 50 : Infinity);
    return { minX, maxX, minY, maxY: trunk.base.y + 110 };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const svg = select(this.svgRef().nativeElement);
      this.zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent(SCALE_EXTENT)
        .extent(() => {
          const { width, height } = this.viewportSize();
          return [
            [0, 0],
            [width, height],
          ];
        })
        .on('zoom', (event: { transform: ZoomTransform }) => {
          this.viewportRef().nativeElement.setAttribute('transform', event.transform.toString());
        });
      svg.call(this.zoomBehavior).on('dblclick.zoom', null);
      this.resetView();
      destroyRef.onDestroy(() => svg.on('.zoom', null));

      if (this.growth() === 'growing') {
        const total = GROW_MS + Math.max(0, this.layout().generationCount - 1) * STAGGER_MS;
        const timer = setTimeout(() => this.growth.set('grown'), total);
        destroyRef.onDestroy(() => clearTimeout(timer));
      }
    });
  }

  zoomBy(factor: number): void {
    if (this.zoomBehavior) {
      this.zoomBehavior.scaleBy(select(this.svgRef().nativeElement), factor);
    }
  }

  resetView(): void {
    if (this.zoomBehavior) {
      this.zoomBehavior.transform(select(this.svgRef().nativeElement), this.fitTransform());
    }
  }

  /** Keyboard focus on a medallion outside the visible area pans it to the centre. */
  protected onFocusIn(event: FocusEvent): void {
    const id = (event.target as Element | null)?.closest('g[etMedallion]')?.getAttribute('data-member-id');
    const placed = id ? this.layout().members.find((m) => m.id === id) : undefined;
    if (!placed || !this.zoomBehavior) {
      return;
    }
    const svg = this.svgRef().nativeElement;
    const [sx, sy] = zoomTransform(svg).apply([placed.center.x, placed.center.y]);
    const { width, height } = this.viewportSize();
    const visible = sx >= FOCUS_MARGIN && sx <= width - FOCUS_MARGIN && sy >= FOCUS_MARGIN && sy <= height - FOCUS_MARGIN;
    if (!visible) {
      this.zoomBehavior.translateTo(select(svg), placed.center.x, placed.center.y);
    }
  }

  protected onAliiKeydown(event: KeyboardEvent, member: FamilyMember): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.memberActivate.emit(member);
    }
  }

  protected onHover(id: string, hovering: boolean): void {
    if (hovering) {
      this.hoveredId.set(id);
    } else if (this.hoveredId() === id) {
      this.hoveredId.set(null);
    }
  }

  private viewportSize(): { width: number; height: number } {
    const el = this.svgRef().nativeElement;
    return {
      width: el.clientWidth || FALLBACK_VIEWPORT.width,
      height: el.clientHeight || FALLBACK_VIEWPORT.height,
    };
  }

  private fitTransform(): ZoomTransform {
    const { width, height } = this.viewportSize();
    const box = this.contentBox();
    const k = Math.min(
      SCALE_EXTENT[1],
      Math.max(SCALE_EXTENT[0], 0.95 * Math.min(width / (box.maxX - box.minX), height / (box.maxY - box.minY))),
    );
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    return zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k);
  }
}
