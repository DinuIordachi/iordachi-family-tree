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
import { ZoomBehavior, ZoomTransform, zoom, zoomIdentity } from 'd3-zoom';
import { branchPath, rootsPath, trunkPath } from '../engraving/branch-geometry';
import { buildHouseholds } from '../engraving/households';
import { layoutTree } from '../engraving/layout';
import { lineageBranchIds } from '../engraving/lineage';
import { fullName } from '../engraving/member-text';
import { placeMotifs } from '../engraving/motif-placement';
import { hashSeed } from '../engraving/seeded-random';
import { Point, TreeLayout } from '../engraving/types';
import { EngravingDefsComponent } from './engraving-defs.component';
import { MedallionComponent } from './medallion.component';
import { MotifComponent } from './motif.component';

const SCALE_EXTENT: [number, number] = [0.25, 2.5];
const CROWN_PAD = 80;
const FALLBACK_VIEWPORT = { width: 1200, height: 800 };

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

  protected readonly layout = computed(() => layoutTree(buildHouseholds(this.members())));
  protected readonly motifs = computed(() => placeMotifs(this.layout(), hashSeed('iordachi')));
  private readonly byId = computed(() => new Map(this.members().map((m) => [m.id, m])));

  protected readonly placedMembers = computed(() =>
    this.layout().members.map((p) => ({ ...p, member: this.byId().get(p.id)! })),
  );
  protected readonly branches = computed(() =>
    this.layout().branches.map((b) => ({ id: b.id, generation: b.generation, d: branchPath(b) })),
  );
  protected readonly trunkD = computed(() => trunkPath(this.layout().trunk));
  protected readonly rootsD = computed(() => rootsPath(this.layout().trunk.base, hashSeed('roots')));
  protected readonly crownD = computed(() => crownPath(this.layout()));
  protected readonly lineage = computed(() => {
    const id = this.hoveredId();
    return new Set(id ? lineageBranchIds(id, this.layout()) : []);
  });
  protected readonly unplacedNames = computed(() =>
    this.layout().unplacedMemberIds.map((id) => fullName(this.byId().get(id)!)),
  );

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
  protected readonly aliiAt = computed<Point>(() => ({
    x: Math.max(this.layout().bounds.maxX, this.layout().trunk.base.x + 330) + 120,
    y: this.layout().trunk.base.y - 160,
  }));

  /** World-space box that must fit the viewport. */
  private readonly contentBox = computed(() => {
    const { bounds, trunk } = this.layout();
    const minX = Math.min(bounds.minX - 110, trunk.base.x - 340);
    const maxX = Math.max(bounds.maxX + 110, trunk.base.x + 340, this.unplacedNames().length ? this.aliiAt().x + 220 : -Infinity);
    return { minX, maxX, minY: this.titleAt().y - 50, maxY: trunk.base.y + 110 };
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
