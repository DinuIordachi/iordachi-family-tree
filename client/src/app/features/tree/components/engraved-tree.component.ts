import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
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
import 'd3-transition';
import { ZoomBehavior, ZoomTransform, zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { branchWidths } from '../engraving/branch-geometry';
import { Clearing, generateFoliage } from '../engraving/foliage';
import { splitForest } from '../engraving/forest';
import { buildHouseholds } from '../engraving/households';
import { DEFAULT_LAYOUT_OPTIONS, layoutTree } from '../engraving/layout';
import { lineageBranchIds } from '../engraving/lineage';
import { bannerSpan, fullName, lifespan } from '../engraving/member-text';
import { FIXED_MOTIFS, placeMotifs } from '../engraving/motif-placement';
import { hashSeed } from '../engraving/seeded-random';
import { MotifId, MotifPlacement, Point, TreeLayout } from '../engraving/types';
import { engravedBranch, engravedTrunk, rootSystem, soilHatching } from '../engraving/wood';
import { seededRandom } from '../engraving/seeded-random';
import { EngravingDefsComponent } from './engraving-defs.component';
import { MedallionComponent } from './medallion.component';
import { MotifComponent } from './motif.component';

const SCALE_EXTENT: [number, number] = [0.25, 2.5];
const FALLBACK_VIEWPORT = { width: 1200, height: 800 };
/** Person slots widen (up to this cap) so the longest name's banner never touches its neighbours. */
const MAX_PERSON_GAP = 280;
const FOCUS_MARGIN = 80;
const ALII_LINE = 20;
/** Medallion rim plus laurel ring: a couple's cord runs between these on each side. */
const MEDALLION_REACH = 46;
/** Depth of the soil cutaway holding the roots. */
const SOIL_DEPTH = 230;
/** Named layers for the fixed motifs (the brief's SVG architecture). */
const MOTIF_LAYERS: Partial<Record<MotifId, string>> = {
  'eagle-cross': 'coat-of-arms',
  'aurochs-shield': 'trunk-shield',
  'stefan-cel-mare': 'stephen-the-great',
  'molda-hound': 'molda',
};
/** Spec §5: --et-dur-grow (1600ms) plus one 300ms stagger per generation after the first. */
const GROW_MS = 1600;
const STAGGER_MS = 300;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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

/** How much smaller the neighbouring family tree stands, further back in the forest. */
const BACK_SCALE = 0.68;
/** How much higher its ground sits on the horizon (further away). */
const BACK_HORIZON = 70;
const DIVE_MS = 900;
/** Width of the parchment detail drawer (26rem), which overlaps the right of the canvas. */
const DRAWER_WIDTH = 416;

type Placed = TreeLayout['members'][number] & { member: FamilyMember };

/** One knot between each pair of neighbouring spouses. */
function knotsOf(layout: TreeLayout): Point[] {
  const knots: Point[] = [];
  const members = layout.members;
  for (let i = 1; i < members.length; i++) {
    const [a, b] = [members[i - 1], members[i]];
    if (a.householdId === b.householdId) {
      knots.push({ x: (a.center.x + b.center.x) / 2, y: a.center.y });
    }
  }
  return knots;
}

/** Engraved branches; a branch that forks again ends at its children's start width. */
function branchesOf(layout: TreeLayout) {
  // a limb that forks again tapers only to the thickest limb it carries on
  const onward = new Map<string, number>();
  for (const b of layout.branches) {
    if (b.parentHouseholdId !== null) {
      const w = branchWidths(b.generation, b.weight).start;
      onward.set(b.parentHouseholdId, Math.max(onward.get(b.parentHouseholdId) ?? 0, w));
    }
  }
  return layout.branches.map((b) => {
    const wood = engravedBranch(b, onward.get(b.childHouseholdId));
    return { id: b.id, generation: b.generation, d: wood.body, bark: wood.grooves + wood.shading, twigs: wood.twigs };
  });
}

/** Medallions, banners and couple cords are kept clear of leaves so they stay legible. */
function personClearings(placed: Placed[], knots: Point[], personGap: number, cordHalf: number): Clearing[] {
  const list: Clearing[] = [];
  for (const p of placed) {
    const { x, y } = p.center;
    const ribbonHalf = Math.min(bannerSpan(fullName(p.member)), personGap - 8) / 2 + 3;
    list.push({ kind: 'ellipse', cx: x, cy: y, rx: 54, ry: 62 });
    list.push({ kind: 'rect', x: x - ribbonHalf, y: y + 44, w: ribbonHalf * 2, h: 28 });
    if (lifespan(p.member)) {
      list.push({ kind: 'rect', x: x - 36, y: y + 72, w: 72, h: 22 });
    }
  }
  for (const k of knots) {
    list.push({ kind: 'rect', x: k.x - cordHalf, y: k.y - 12, w: cordHalf * 2, h: 26 });
  }
  return list;
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
  /** Which tree the camera shows: the main one, or the neighbouring family tree behind it. */
  readonly viewing = signal<'main' | 'back'>('main');

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly viewportRef = viewChild.required<ElementRef<SVGGElement>>('viewport');
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;
  private readonly injector = inject(Injector);
  /** Once the visitor pans or zooms, resizes keep their view instead of re-fitting. */
  private userMoved = false;

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly growth = signal<'growing' | 'grown'>(prefersReducedMotion() ? 'grown' : 'growing');

  protected readonly personGap = computed(() => {
    const widest = Math.max(0, ...this.members().map((m) => bannerSpan(fullName(m)) + 10));
    return Math.min(MAX_PERSON_GAP, Math.max(DEFAULT_LAYOUT_OPTIONS.personGap, widest));
  });
  private readonly split = computed(() => splitForest(this.members()));
  protected readonly layout = computed(() =>
    layoutTree(buildHouseholds(this.split().main), { personGap: this.personGap() }),
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
  protected readonly branches = computed(() => branchesOf(this.layout()));
  protected readonly trunks = computed(() =>
    this.layout().trunks.map((t, i) => engravedTrunk(t, hashSeed('trunk', String(i)))),
  );
  private readonly soil = computed(() => {
    const { bounds, trunk } = this.layout();
    const spreadX = Math.max(330, (bounds.maxX - bounds.minX) / 2 + 60);
    return { base: trunk.base, opts: { spreadX, depth: SOIL_DEPTH } };
  });
  /** One root system under each trunk, spreading through the shared soil cutaway. */
  protected readonly roots = computed(() => {
    const parts = this.layout().trunks.map((t, i) => rootSystem(t.base, this.soil().opts, hashSeed('roots', String(i))));
    return {
      bodies: parts.map((r) => r.bodies).join(''),
      grooves: parts.map((r) => r.grooves).join(''),
      fine: parts.map((r) => r.fine).join(''),
    };
  });
  protected readonly soilD = computed(() => soilHatching(this.soil().base, this.soil().opts, hashSeed('soil')));
  /** Tufts of grass along the ground line. */
  protected readonly grassD = computed(() => {
    const rnd = seededRandom(hashSeed('grass'));
    const g = this.ground();
    let d = '';
    for (let x = g.x + 20; x < g.x + g.width - 20; x += 7 + rnd() * 16) {
      const h = 3 + rnd() * 6;
      d += `M${x.toFixed(1)} ${g.y}l${(rnd() * 4 - 2).toFixed(1)} ${(-h).toFixed(1)}M${(x + 2).toFixed(1)} ${g.y}l${(rnd() * 3).toFixed(1)} ${(-h * 0.7).toFixed(1)}`;
    }
    return d;
  });
  /** Medallions, banners, couple cords and ornaments are kept clear of leaves so they stay legible. */
  private readonly clearings = computed<Clearing[]>(() => {
    const list = personClearings(this.placedMembers(), this.knots(), this.personGap(), this.cordHalf());
    for (const m of this.motifs()) {
      if (m.placement.motif === 'eagle-cross') {
        // a niche at the top of the crown for the coat of arms
        list.push({ kind: 'ellipse', cx: m.placement.center.x, cy: m.placement.center.y, rx: 128, ry: 100 });
      } else if (!FIXED_MOTIFS.includes(m.placement.motif)) {
        list.push({ kind: 'ellipse', cx: m.placement.center.x, cy: m.placement.center.y, rx: 46, ry: 46 });
      }
    }
    return list;
  });
  protected readonly foliage = computed(() =>
    generateFoliage(this.layout(), { seed: hashSeed('foliage'), clearings: this.clearings() }),
  );
  protected readonly lineage = computed(() => {
    const id = this.hoveredId();
    return new Set(id ? lineageBranchIds(id, this.layout()) : []);
  });
  protected readonly unplaced = computed(() =>
    this.layout().unplacedMemberIds.map((id) => ({ id, member: this.byId().get(id)!, name: fullName(this.byId().get(id)!) })),
  );
  /** One knot between each pair of neighbouring spouses, with a cord from rim to rim. */
  protected readonly knots = computed(() => knotsOf(this.layout()));
  /** The main tree's family name, from its founders (for the "back to" control). */
  protected readonly mainFamily = computed(() => {
    const founder = this.layout().members.find((m) => m.generation === 0);
    return (founder && this.byId().get(founder.id)?.data['last name']) || '';
  });

  /**
   * The spouse's family as its own tree standing behind the main one: smaller, higher on the horizon,
   * toward her side, so the two crowns overlap and mix like neighbouring trees in a forest.
   */
  protected readonly back = computed(() => {
    const split = this.split().back;
    if (!split) {
      return null;
    }
    const layout = layoutTree(buildHouseholds(split.members), { personGap: this.personGap() });
    const placed: Placed[] = layout.members.map((p) => ({ ...p, member: this.byId().get(p.id)! }));
    const knots = knotsOf(layout);
    const main = this.layout();
    // its trunk stands near the outer edge of the main crown, so half its crown mixes with the main one
    const targetX = main.bounds.maxX - 40;
    const tx = targetX - BACK_SCALE * layout.trunk.base.x;
    const ty = main.trunk.base.y - BACK_HORIZON - BACK_SCALE * layout.trunk.base.y;
    const { bounds } = layout;
    const spreadX = Math.max(260, (bounds.maxX - bounds.minX) / 2 + 40);
    return {
      layout,
      placed,
      knots,
      focusId: split.focusMemberId,
      branches: branchesOf(layout),
      trunks: layout.trunks.map((t, i) => engravedTrunk(t, hashSeed('back-trunk', String(i)))),
      roots: rootSystem(layout.trunk.base, { spreadX, depth: SOIL_DEPTH * 0.8 }, hashSeed('back-roots')),
      foliage: generateFoliage(layout, {
        seed: hashSeed('back-foliage'),
        clearings: personClearings(placed, knots, this.personGap(), this.cordHalf()),
        maxLeaves: 6000,
      }),
      transform: `translate(${tx} ${ty}) scale(${BACK_SCALE})`,
      box: {
        minX: tx + BACK_SCALE * (bounds.minX - 110),
        maxX: tx + BACK_SCALE * (bounds.maxX + 110),
        minY: ty + BACK_SCALE * (bounds.minY - 150),
        maxY: ty + BACK_SCALE * (layout.trunk.base.y + SOIL_DEPTH),
      },
    };
  });
  protected readonly cordHalf = computed(() => Math.max(0, this.personGap() / 2 - MEDALLION_REACH));

  protected readonly ground = computed(() => {
    const { bounds, trunk } = this.layout();
    const minX = Math.min(bounds.minX, trunk.base.x - 330) - 160;
    const maxX = Math.max(bounds.maxX, trunk.base.x + 330) + 160;
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

  /** World-space box that must fit the viewport: the main tree (with the one behind it peeking out), or the one behind. */
  private readonly contentBox = computed(() => {
    const back = this.back();
    if (this.viewing() === 'back' && back) {
      return back.box;
    }
    const { bounds, trunk } = this.layout();
    const minX = Math.min(bounds.minX - 110, trunk.base.x - 340);
    const hasAlii = this.unplaced().length > 0;
    const maxX = Math.max(bounds.maxX + 110, trunk.base.x + 340, hasAlii ? this.aliiAt().x + 220 : -Infinity, back ? back.box.maxX : -Infinity);
    const minY = Math.min(this.titleAt().y - 50, hasAlii ? this.aliiAt().y - 50 : Infinity, back ? back.box.minY : Infinity);
    return { minX, maxX, minY, maxY: trunk.base.y + SOIL_DEPTH + 20 };
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
        .on('zoom', (event: { transform: ZoomTransform; sourceEvent: unknown }) => {
          if (event.sourceEvent) {
            this.userMoved = true;
          }
          this.viewportRef().nativeElement.setAttribute('transform', event.transform.toString());
        });
      svg.call(this.zoomBehavior).on('dblclick.zoom', null);
      this.resetView();
      destroyRef.onDestroy(() => svg.on('.zoom', null));

      // The first fit can run before layout settles (late styles, rotation, window resize): re-fit until the visitor moves.
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => {
          if (!this.userMoved) {
            this.applyFit();
          }
        });
        observer.observe(this.svgRef().nativeElement);
        destroyRef.onDestroy(() => observer.disconnect());
      }

      if (this.growth() === 'growing') {
        const total = GROW_MS + Math.max(0, this.layout().generationCount - 1) * STAGGER_MS;
        const timer = setTimeout(() => this.growth.set('grown'), total);
        destroyRef.onDestroy(() => clearTimeout(timer));
      }
    });
  }

  zoomBy(factor: number): void {
    if (this.zoomBehavior) {
      this.userMoved = true;
      this.zoomBehavior.scaleBy(select(this.svgRef().nativeElement), factor);
    }
  }

  resetView(): void {
    this.userMoved = false;
    this.applyFit();
  }

  private applyFit(animate = false): void {
    if (!this.zoomBehavior) {
      return;
    }
    const svg = select(this.svgRef().nativeElement);
    if (animate && !prefersReducedMotion()) {
      svg.transition().duration(DIVE_MS).call(this.zoomBehavior.transform, this.fitTransform());
    } else {
      this.zoomBehavior.transform(svg, this.fitTransform());
    }
  }

  /** A member was activated in one of the trees; clicking the spouse in the main tree dives into her family's tree. */
  protected onActivate(member: FamilyMember, scene: 'main' | 'back'): void {
    this.memberActivate.emit(member);
    const back = this.back();
    if (scene === 'main' && back && member.id === back.focusId && this.viewing() === 'main') {
      this.viewing.set('back');
      this.userMoved = false;
      // move the camera once the selection (and its drawer) has rendered, so the fit leaves room for it
      afterNextRender(() => this.applyFit(true), { injector: this.injector });
    }
  }

  returnToMain(): void {
    if (this.viewing() === 'back') {
      this.viewing.set('main');
      this.userMoved = false;
      this.applyFit(true);
    }
  }

  protected motifLayerId(motif: MotifId): string | null {
    return MOTIF_LAYERS[motif] ?? null;
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

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.returnToMain();
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
    const viewport = this.viewportSize();
    const height = viewport.height;
    // while the detail drawer is open (a person is selected), fit into the space left of it
    const width = this.selectedId() ? Math.max(viewport.width * 0.4, viewport.width - DRAWER_WIDTH) : viewport.width;
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
