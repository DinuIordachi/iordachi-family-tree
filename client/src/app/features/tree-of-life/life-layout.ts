import { hierarchy, HierarchyPointNode, tree } from 'd3-hierarchy';
import { FamilyMember } from '@app/core/models';
import { GIRDLE_LINE, GIRDLE_WIDTH } from './girdle';
import { distToSeg, pathSegs, polyD, Pt, samplePolyline, Seg } from './life-geometry';
import { LINE, motifHalf } from './ornament-scale';

/**
 * Pure layout for the /tree-of-life view.
 *
 * Follows the "Meet, Moldova" Tree of Life language: one continuous
 * central stem (never cut) rising to a rose, generations stacked from the
 * roots upward, and every descent drawn as a thick "circuit" branch that
 * leaves its parents vertically, turns 45°, runs horizontally and rises
 * into a folk motif. Families joined by marriage hang off the outer edge
 * of the same tree — the guide allows only one Tree per support.
 */

/**
 * The ornament's line colours, exactly as they appear in the reference vectors
 * (Moldova_ornament_with-transperency.svg, braul.svg, braul2.svg).
 */
export const PALETTE = {
  orange: '#f1492e',
  red: '#e11631',
  wine: '#951247',
  magenta: '#b8377f',
  green: '#418922',
  forest: '#226f4c',
  blue: '#277395',
  ochre: '#cf850b',
  peach: '#f6885e',
  black: '#000000',
} as const;

/**
 * The ornament's "transparency": where a line or element lies over another,
 * the overlap is painted in a lighter tint of whatever is on top. These are
 * the reference's own tint fills (ochre has none there; its tint is derived
 * on the same lightening).
 */
export const TINT: Record<string, string> = {
  [PALETTE.green]: '#46ac3b',
  [PALETTE.forest]: '#409767',
  [PALETTE.blue]: '#3b8bad',
  [PALETTE.magenta]: '#cb5a94',
  [PALETTE.red]: '#f04157',
  [PALETTE.orange]: '#f36435',
  [PALETTE.wine]: '#b8377f',
  [PALETTE.peach]: '#f89d78',
  [PALETTE.ochre]: '#dd9c34',
};
export const tintOf = (c: string): string => TINT[c] ?? c;

/** Colours branches cycle through; green is the stem's, forest is kept for in-law lines (last). */
export const BRANCH_COLORS = [
  PALETTE.orange,
  PALETTE.red,
  PALETTE.magenta,
  PALETTE.blue,
  PALETTE.ochre,
  PALETTE.wine,
  PALETTE.peach,
  PALETTE.forest,
] as const;

/** Ornament elements, assigned one per generation (oldest first). */
export const MOTIFS = ['basil', 'glass', 'pomegranate', 'connectivity', 'flower', 'energy', 'textile', 'heart'] as const;
export type MotifKind = (typeof MOTIFS)[number];

/**
 * Inner-detail colour for each element colour, after the ornament's own
 * pairings (forest glass filled green, wine chip with a red dot, blue flower
 * with an orange heart, ochre textile with a forest dot, magenta basil with
 * peach squares, ...).
 */
export const ACCENT: Record<string, string> = {
  [PALETTE.orange]: PALETTE.red,
  [PALETTE.red]: PALETTE.wine,
  [PALETTE.wine]: PALETTE.red,
  [PALETTE.magenta]: PALETTE.peach,
  [PALETTE.green]: PALETTE.forest,
  [PALETTE.forest]: PALETTE.green,
  [PALETTE.blue]: PALETTE.orange,
  [PALETTE.ochre]: PALETTE.forest,
  [PALETTE.peach]: PALETTE.orange,
};

export const GEOMETRY = {
  /** Minimum rise from one generation to the next; a gap grows with the lanes it needs. */
  tier: 280,
  /** One line weight for everything, the elements' own outlines included. */
  stroke: LINE,
  coupleSpacing: 180,
  /** Room a label above an element needs across. */
  labelWidth: 150,
  /** Room a label beside an element needs (single parents, whose branch leaves from their top). */
  sideLabel: 130,
  unitGap: 34,
  trunkClear: 92,
  blockGap: 120,
  /** How far a line's end reaches inside the element it joins: the overlap reads as a lighter joint. */
  joint: 6,
  /** The connectivity arcs float just above the end of their line, as in the ornament. */
  arcGap: 5,
  /** How far a basil couple's bar rises (on the diagonal) above the flowers. */
  basilLift: 60,
  /** The girdle is drawn so its lines match the tree's line weight. */
  girdleScale: LINE / GIRDLE_LINE,
  /** Its upper rail, in girdle units from the band's top edge: where the stem ends. */
  girdleRail: 40.9,
  /** The two label lines above an element. */
  labelBlock: 36,
  /** Air between a label and the line run passing above it. */
  labelGap: 21,
  /** Centre-to-centre distance of parallel runs: 1.5 line widths of air between them. */
  lane: 35,
  diagonal: 36,
  /** The turn up into a child is a full diagonal too, never a short bevel. */
  chamfer: 36,
  /** Length (along each axis) of a chevron arm on the stem. */
  leafArm: 56,
  /**
   * Members with a photo keep it, as an agreed exception to the ornament:
   * a round photo in a disc of their line colour, their folk element as a badge.
   */
  avatar: 31,
} as const;

export type LabelSide = 'above' | 'left' | 'right';

export interface LifeMotif {
  id: string;
  member: FamilyMember;
  x: number;
  y: number;
  gen: number;
  motif: MotifKind;
  color: string;
  accent: string;
  deceased: boolean;
  /** Drawn mirrored, so an asymmetric element faces the line joining it. */
  mirror: boolean;
  /** Shown as a photo avatar (see GEOMETRY.avatar) instead of the bare element. */
  photo: boolean;
  /** Half size of what is drawn: the element, or the avatar disc. */
  half: { w: number; h: number };
  /** Clearance above the centre taken by the element (and a raised bar): labels sit above it. */
  top: number;
  /** Labels go beside single parents, whose children's branch leaves from their top. */
  label: LabelSide;
}

export interface LifeBranch {
  id: string;
  d: string;
  color: string;
  gen: number;
  parentIds: string[];
  childId: string;
}

/**
 * A stretch of a sibling's rising line that is drawn by another sibling (the
 * carrier). Not drawn on its own: it only re-paints that stretch when the
 * sibling is lit and the carrier is not, so a lit lineage reads unbroken.
 */
export interface LifeRun {
  id: string;
  d: string;
  color: string;
  parentIds: string[];
  childId: string;
}

export interface LifeBond {
  id: string;
  /** The bar as drawn (straight, or rising through basil flowers' open slots). */
  d: string;
  x1: number;
  x2: number;
  y: number;
  color: string;
  memberIds: string[];
  gen: number;
}

/** A chevron on the stem: two arms (forest left, green right), each ending in a terminal. */
export interface LifeLeaf {
  y: number;
  lines: { d: string; color: string }[];
}

export interface LifeLayout {
  motifs: LifeMotif[];
  branches: LifeBranch[];
  /** Shared stretches of sibling lines, for highlighting only (see LifeRun). */
  runs: LifeRun[];
  bonds: LifeBond[];
  trunk: { x: number; top: number; bottom: number };
  leaves: LifeLeaf[];
  rose: { x: number; y: number };
  girdleY: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  generations: number;
  rootSurname: string;
}

interface Unit {
  id: string;
  members: string[];
  gen: number;
  x: number;
  width: number;
  children: Unit[];
  block: number;
}

const byBirth = (a: FamilyMember, b: FamilyMember): number => {
  const da = a.data.birthday ?? '';
  const db = b.data.birthday ?? '';
  if (da && db && da !== db) return da < db ? -1 : 1;
  if (da && !db) return -1;
  if (!da && db) return 1;
  return Number(a.id) - Number(b.id) || a.id.localeCompare(b.id);
};

const kindOf = (gen: number): MotifKind => MOTIFS[gen % MOTIFS.length];
const hasPhoto = (m: FamilyMember): boolean => !!m.thumbnailUrl;
/** Half size of a member's figure: their photo disc, or their generation's element. */
const figureHalf = (m: FamilyMember, gen: number): { w: number; h: number } =>
  hasPhoto(m) ? { w: GEOMETRY.avatar, h: GEOMETRY.avatar } : motifHalf(kindOf(gen));
/** Where a line rising into a member's figure ends, below its centre (a joint just inside its rim). */
const figureJoin = (m: FamilyMember, gen: number): number => {
  const h = figureHalf(m, gen).h;
  // The connectivity arcs float just above their line instead.
  return !hasPhoto(m) && kindOf(gen) === 'connectivity' ? h + GEOMETRY.arcGap + GEOMETRY.stroke / 2 : h - GEOMETRY.joint;
};

export function layoutLife(members: FamilyMember[]): LifeLayout {
  const G = GEOMETRY;
  const byId = new Map(members.map((m) => [m.id, m]));
  const rel = (m: FamilyMember, k: keyof FamilyMember['rels']) => m.rels[k].filter((id) => byId.has(id));

  const empty: LifeLayout = {
    motifs: [],
    branches: [],
    runs: [],
    bonds: [],
    trunk: { x: 0, top: -G.tier, bottom: 90 },
    leaves: [],
    rose: { x: 0, y: -G.tier },
    girdleY: 120,
    bounds: { minX: -300, maxX: 300, minY: -G.tier - 80, maxY: 160 },
    generations: 0,
    rootSurname: '',
  };
  if (!members.length) return empty;

  // ---- 1. Generations (BFS over all relations, per connected component).
  const descendants = (id: string, seen = new Set<string>()): number => {
    for (const c of rel(byId.get(id)!, 'children')) if (!seen.has(c)) (seen.add(c), descendants(c, seen));
    return seen.size;
  };
  const sorted = [...members].sort(byBirth);
  const founders = sorted.filter((m) => !rel(m, 'parents').length);
  const rootPerson = [...(founders.length ? founders : sorted)].sort(
    (a, b) => descendants(b.id) - descendants(a.id) || byBirth(a, b),
  )[0];

  const gen = new Map<string, number>();
  const bfs = (start: string) => {
    const comp: string[] = [];
    gen.set(start, 0);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift()!;
      comp.push(id);
      const m = byId.get(id)!;
      const g = gen.get(id)!;
      const next: [string, number][] = [
        ...rel(m, 'parents').map((p): [string, number] => [p, g - 1]),
        ...rel(m, 'children').map((c): [string, number] => [c, g + 1]),
        ...rel(m, 'spouses').map((s): [string, number] => [s, g]),
      ];
      for (const [n, ng] of next) if (!gen.has(n)) (gen.set(n, ng), queue.push(n));
    }
    const min = Math.min(...comp.map((id) => gen.get(id)!));
    for (const id of comp) gen.set(id, gen.get(id)! - min);
  };
  bfs(rootPerson.id);
  for (const m of sorted) if (!gen.has(m.id)) bfs(m.id);

  // ---- 2. Units: a person with their spouse(s).
  const unitOf = new Map<string, Unit>();
  const units: Unit[] = [];
  const makeUnit = (m: FamilyMember) => {
    const ids = [m.id, ...rel(m, 'spouses').filter((s) => !unitOf.has(s))];
    const u: Unit = { id: ids.join('+'), members: ids, gen: gen.get(m.id)!, x: 0, width: 0, children: [], block: -1 };
    u.width = (ids.length - 1) * G.coupleSpacing + G.labelWidth;
    ids.forEach((id) => unitOf.set(id, u));
    units.push(u);
  };
  makeUnit(rootPerson);
  for (const m of sorted) if (!unitOf.has(m.id)) makeUnit(m);

  const parentUnit = (id: string): Unit | undefined => {
    const p = rel(byId.get(id)!, 'parents')[0];
    return p ? unitOf.get(p) : undefined;
  };
  const childrenOf = (u: Unit): FamilyMember[] => {
    const ids = new Set(u.members.flatMap((id) => rel(byId.get(id)!, 'children')));
    return [...ids].map((id) => byId.get(id)!).filter((c) => parentUnit(c.id) === u).sort(byBirth);
  };

  // ---- 3. Claim descendant trees into blocks (block 0 = the main line).
  const claim = (u: Unit, block: number) => {
    u.block = block;
    for (const c of childrenOf(u)) {
      const cu = unitOf.get(c.id)!;
      if (cu.block === -1 && cu.gen === u.gen + 1) {
        u.children.push(cu);
        claim(cu, block);
      }
    }
  };
  const rootUnit = unitOf.get(rootPerson.id)!;
  claim(rootUnit, 0);
  const blockRoots: Unit[] = [rootUnit];
  for (;;) {
    const free = units.filter((u) => u.block === -1);
    if (!free.length) break;
    const next =
      free.filter((u) => u.members.every((id) => !parentUnit(id) || parentUnit(id)!.block !== -1))
        .sort((a, b) => a.gen - b.gen)[0] ?? free[0];
    claim(next, blockRoots.length);
    blockRoots.push(next);
  }


  // Unit widths, now that we know who has children: an element with its label
  // above, or a single parent with the label beside it (their branch leaves upward).
  for (const u of units) {
    const hw = Math.max(...u.members.map((id) => figureHalf(byId.get(id)!, u.gen).w));
    u.width =
      u.members.length === 1 && childrenOf(u).length
        ? 2 * (hw + 12 + G.sideLabel)
        : (u.members.length - 1) * G.coupleSpacing + Math.max(G.labelWidth, 2 * hw + 16);
  }

  // ---- 4. Horizontal placement.
  const separation = (a: HierarchyPointNode<Unit>, b: HierarchyPointNode<Unit>) =>
    (a.data.width + b.data.width) / 2 + G.unitGap;
  const layoutForest = (roots: Unit[]): Unit[] => {
    if (!roots.length) return [];
    const virtual: Unit = { id: '~', members: [], gen: roots[0].gen - 1, x: 0, width: 0, children: roots, block: -2 };
    const h = tree<Unit>().nodeSize([1, 1]).separation(separation)(hierarchy(virtual, (u) => u.children));
    const placed: Unit[] = [];
    h.each((n) => {
      if (n.data !== virtual) (n.data.x = n.x, placed.push(n.data));
    });
    return placed;
  };
  // Main line: the stem is the family's spine. It rises through the founders
  // and on through the heaviest line of descent (counting the families that
  // hang off it) for as long as that line branches on, then ends in the rose.
  // Everyone else's children alternate left/right off the stem, balanced by
  // weight, so the stem stays near the middle of the crown.
  const subtree = (u: Unit): Unit[] => [u, ...u.children.flatMap(subtree)];
  const blockUnits = (b: number) => units.filter((u) => u.block === b);
  const hangsOff = (b: number, own: Set<Unit>) =>
    blockUnits(b).some((u) => childrenOf(u).some((ch) => own.has(unitOf.get(ch.id)!)));
  const weight = (c: Unit): number => {
    const own = new Set(subtree(c));
    let w = own.size;
    for (let b = 1; b < blockRoots.length; b++) if (hangsOff(b, own)) w += blockUnits(b).length;
    return w;
  };
  const spine: Unit[] = [rootUnit];
  for (;;) {
    const next = [...spine.at(-1)!.children].sort((a, b) => weight(b) - weight(a))[0];
    if (!next?.children.length) break;
    spine.push(next);
  }
  const onSpine = new Set(spine);

  // What hangs beside the stem: each spine couple's other children, and the
  // families of anyone who married onto the spine. Heaviest first, each to
  // the lighter side.
  const spineBlocks = blockRoots
    .map((r, b) => b)
    .filter((b) => b > 0 && spine.some((u) => hangsOff(b, new Set([u]))));
  type Side = { level: number; left: Unit[]; right: Unit[] };
  const sides: Side[] = spine.map((_, level) => ({ level, left: [], right: [] }));
  const blockSide = new Map<number, number>();
  let lw = 0;
  let rw = 0;
  const items = [
    ...spine.flatMap((u, level) =>
      u.children.filter((c) => !onSpine.has(c)).map((c) => ({ w: weight(c), put: (s: number) => (s < 0 ? sides[level].left : sides[level].right).push(c) })),
    ),
    ...spineBlocks.map((b) => ({ w: blockUnits(b).length, put: (s: number) => blockSide.set(b, s) })),
  ].sort((a, b) => b.w - a.w);
  for (const it of items) {
    const s = lw <= rw ? -1 : 1;
    it.put(s);
    if (s < 0) lw += it.w;
    else rw += it.w;
  }
  // Someone who married onto the spine stands on the side their family hangs.
  for (const u of spine) {
    const inLaw = u.members.find((id) => blockSide.has(parentUnit(id)?.block ?? -1));
    if (!inLaw || u.members.length < 2) continue;
    const s = blockSide.get(parentUnit(inLaw)!.block)!;
    u.members.splice(u.members.indexOf(inLaw), 1);
    if (s < 0) u.members.unshift(inLaw);
    else u.members.push(inLaw);
  }

  const extent = (list: Unit[]) => {
    const lo = new Map<number, number>();
    const hi = new Map<number, number>();
    for (const u of list) {
      lo.set(u.gen, Math.min(lo.get(u.gen) ?? Infinity, u.x - u.width / 2));
      hi.set(u.gen, Math.max(hi.get(u.gen) ?? -Infinity, u.x + u.width / 2));
    }
    return { lo, hi };
  };
  const shift = (list: Unit[], dx: number) => list.forEach((u) => (u.x += dx));
  /**
   * Moves a block to one side of everything placed, generation by generation.
   * Where nothing is placed yet it keeps `free` from the stem, or (without it)
   * stays beyond the whole tree.
   */
  const hang = (block: Unit[], side: number, gap: number, free?: number) => {
    // Only what stands on this side of the stem (the spine included) is in the way.
    const ex = extent(placed.filter((u) => side * u.x >= 0));
    const bx = extent(block);
    let dx = side < 0 ? Infinity : -Infinity;
    for (const g of new Set(block.map((u) => u.gen))) {
      const outer = side < 0 ? Math.min(...ex.lo.values()) : Math.max(...ex.hi.values());
      const known = side < 0 ? ex.lo.get(g) : ex.hi.get(g);
      const edge = known ?? (free !== undefined ? side * (free - gap) : outer);
      dx = side < 0 ? Math.min(dx, edge - gap - bx.hi.get(g)!) : Math.max(dx, edge + gap - bx.lo.get(g)!);
    }
    shift(block, dx);
    placed.push(...block);
  };

  for (const u of spine) u.x = 0;
  const placed: Unit[] = [...spine];
  // From the top of the spine down, so the crown narrows toward the rose.
  const order = (u: Unit, list: Unit[]) => list.sort((a, b) => u.children.indexOf(a) - u.children.indexOf(b));
  for (const { level, left, right } of [...sides].reverse()) {
    // Eldest nearest the stem.
    if (left.length) hang(layoutForest(order(spine[level], left).reverse()), -1, G.trunkClear, G.trunkClear);
    if (right.length) hang(layoutForest(order(spine[level], right)), 1, G.trunkClear, G.trunkClear);
  }

  // Other families hang on the outer side of the member they married into.
  for (const root of blockRoots.slice(1)) {
    const b = blockRoots.indexOf(root);
    const block = layoutForest([root]);
    const blockIds = new Set(block.map((u) => u.id));
    const anchors = block
      .flatMap((u) => childrenOf(u))
      .map((c) => unitOf.get(c.id)!)
      .filter((u) => !blockIds.has(u.id) && placed.includes(u));
    const side = blockSide.get(b) ?? (anchors.length ? Math.sign(anchors.reduce((s, u) => s + u.x, 0)) || 1 : 1);
    hang(block, side, G.blockGap);
  }

  // ---- 5. Member order inside a unit: blood relative toward the stem,
  // anyone whose own parents hang further out on the outer side. (x only:
  // heights depend on how many lanes each generation gap needs.)
  const xOf = new Map<string, number>();
  for (const u of placed) {
    const outward = Math.sign(u.x) || 0;
    const inBlock = (id: string) => parentUnit(id)?.block === u.block;
    const score = (id: string) => {
      const pu = parentUnit(id);
      if (!pu || outward === 0) return 0;
      return inBlock(id) ? -1 : (pu.x - u.x) * outward > 0 ? 1 : -0.5;
    };
    const ordered =
      outward === 0
        ? u.members
        : [...u.members].sort((a, b) => score(a) - score(b)).map((id, i, arr) => arr[outward > 0 ? i : arr.length - 1 - i]);
    ordered.forEach((id, i) => xOf.set(id, u.x + (i - (ordered.length - 1) / 2) * G.coupleSpacing));
  }
  const isBasilCouple = (u: Unit) => u.members.length === 2 && kindOf(u.gen) === 'basil';

  // ---- 6. Edges, with lane assignment per generation gap.
  interface Edge {
    childId: string;
    parent: Unit;
    xs: number;
    xc: number;
    gen: number;
    fromStem: boolean;
    lane: number;
  }
  const edges: Edge[] = [];
  for (const m of sorted) {
    const pu = parentUnit(m.id);
    if (!pu) continue;
    // A spine child's descent is the stem itself.
    if (onSpine.has(pu) && onSpine.has(unitOf.get(m.id)!)) continue;
    const parents = rel(m, 'parents').filter((p) => pu.members.includes(p));
    const px = parents.map((p) => xOf.get(p)!);
    edges.push({
      childId: m.id,
      parent: pu,
      xs: onSpine.has(pu) ? 0 : px.reduce((a, b) => a + b, 0) / px.length,
      xc: xOf.get(m.id)!,
      gen: pu.gen,
      fromStem: onSpine.has(pu),
      lane: 0,
    });
  }
  const gaps = new Map<number, Edge[]>();
  edges.forEach((e) => gaps.set(e.gen, [...(gaps.get(e.gen) ?? []), e]));
  const laneCount = new Map<number, number>();
  for (const [g, list] of gaps) {
    const lanes: Edge[][] = [];
    list.sort((a, b) => Math.abs(b.xc - b.xs) - Math.abs(a.xc - a.xs));
    for (const e of list) {
      const lo = Math.min(e.xs, e.xc);
      const hi = Math.max(e.xs, e.xc);
      let k = 0;
      for (; k < lanes.length; k++) {
        const clash = lanes[k].some((o) => {
          const pad = o.xs === e.xs && Math.sign(o.xc - o.xs) !== Math.sign(e.xc - e.xs) ? -1 : 2 * G.stroke;
          return lo < Math.max(o.xs, o.xc) + pad && Math.min(o.xs, o.xc) < hi + pad;
        });
        if (!clash) break;
      }
      (lanes[k] ??= []).push(e);
      e.lane = k;
    }
    laneCount.set(g, lanes.length);
  }

  // ---- 7. Heights. Each gap rises far enough for the parents' labels, its
  // lanes (1.5 line widths apart), the turn up and the child's joint.
  const maxGen = Math.max(...units.map((u) => u.gen));
  const genMembers = (g: number) => units.filter((u) => u.gen === g).flatMap((u) => u.members.map((id) => byId.get(id)!));
  const topOf = (g: number): number => {
    const own = Math.max(...genMembers(g).map((m) => figureHalf(m, g).h)) + 8;
    const lifted = units.some((u) => u.gen === g && isBasilCouple(u)) ? G.basilLift + G.stroke / 2 + 8 : 0;
    return Math.max(own, lifted);
  };
  /** Where a line rising into an element of generation g ends, below its centre. */
  const joinOf = (g: number): number => Math.max(...genMembers(g).map((m) => figureJoin(m, g)));
  /** From a generation's centre line up to its first run of branches. */
  const clearOf = (g: number): number => topOf(g) + G.labelBlock + G.labelGap;
  const tierYs: number[] = [0];
  for (let g = 0; g < maxGen; g++) {
    const lanes = laneCount.get(g) ?? 1;
    const rise = clearOf(g) + (lanes - 1) * G.lane + G.chamfer + 12 + joinOf(g + 1);
    tierYs.push(tierYs[g] - Math.max(G.tier, Math.ceil(rise)));
  }
  const tierY = (g: number) => tierYs[g];

  // ---- 8. Colours: each line from the founders keeps one branch colour.
  const lineColor = new Map<string, string>();
  const paint = (u: Unit, color: string) => {
    u.members.forEach((id) => lineColor.set(id, color));
    u.children.forEach((c) => paint(c, color));
  };
  // The spine is the stem's green; the lines leaving it cycle through the rest
  // (not red, which the spine's own members wear, nor forest, kept for in-laws).
  const sideColors = BRANCH_COLORS.filter((c) => c !== PALETTE.red && c !== PALETTE.forest);
  let nextColor = 0;
  for (const u of spine) {
    u.members.forEach((id) => lineColor.set(id, PALETTE.green));
    for (const c of u.children) if (!onSpine.has(c)) paint(c, sideColors[nextColor++ % sideColors.length]);
  }
  blockRoots.slice(1).forEach((r) => paint(r, PALETTE.forest));
  const colorOf = (id: string) => lineColor.get(id) ?? PALETTE.blue;

  // ---- 9. Motifs.
  const motifs: LifeMotif[] = [];
  for (const u of placed) {
    const single = u.members.length === 1 && childrenOf(u).length > 0;
    u.members.forEach((id) => {
      const m = byId.get(id)!;
      const x = xOf.get(id)!;
      // Blood relatives wear their line's colour, spouses a companion colour.
      // Someone whose parents belong to another family wears that family's line.
      const pu = parentUnit(id);
      const married = pu && pu.block !== u.block;
      const blood = !!pu || blockRoots.some((r) => r.members[0] === id);
      const own = married ? colorOf(pu.members[0]) : colorOf(id);
      const line = own === PALETTE.green ? PALETTE.red : own;
      const idx = BRANCH_COLORS.indexOf(line as (typeof BRANCH_COLORS)[number]);
      const companion = BRANCH_COLORS[(idx + 3) % BRANCH_COLORS.length];
      const color = blood ? line : companion;
      motifs.push({
        id,
        member: m,
        x,
        y: tierY(u.gen),
        gen: u.gen,
        motif: kindOf(u.gen),
        color,
        accent: ACCENT[color] ?? PALETTE.wine,
        deceased: m.deceased,
        mirror: false,
        photo: hasPhoto(m),
        half: figureHalf(m, u.gen),
        top: topOf(u.gen),
        label: single ? ((Math.sign(x) || 1) > 0 ? 'right' : 'left') : 'above',
      });
    });
  }

  // ---- 10. Marriage bonds.
  // Basil has an open slot where its fourth petal would be; as in the ornament,
  // the line enters there on the diagonal and ends at the flower's heart. So a
  // basil couple's bar rises out of each flower's slot, runs across above them,
  // and the right-hand flower is mirrored to open toward it. Other bars reach
  // just inside each element, so their ends read as joints.
  const lift = new Map<string, number>();
  const bonds: LifeBond[] = placed
    .filter((u) => u.members.length > 1)
    .map((u) => {
      const xs = u.members.map((id) => xOf.get(id)!);
      const y = tierY(u.gen);
      const x1 = Math.min(...xs);
      const x2 = Math.max(...xs);
      const insetOf = (x: number) => figureHalf(byId.get(u.members[xs.indexOf(x)])!, u.gen).w - G.joint;
      let d: string;
      if (isBasilCouple(u)) {
        const k = G.basilLift;
        lift.set(u.id, k);
        d = `M${x1} ${y} L${x1 + k} ${y - k} H${x2 - k} L${x2} ${y}`;
        const right = u.members.find((id) => xOf.get(id) === x2)!;
        motifs.find((m) => m.id === right)!.mirror = true;
      } else {
        d = `M${x1 + insetOf(x1)} ${y} H${x2 - insetOf(x2)}`;
      }
      return {
        id: u.id,
        d,
        x1: x1 + insetOf(x1),
        x2: x2 - insetOf(x2),
        y,
        color: onSpine.has(u) ? PALETTE.green : colorOf(u.members.find((id) => parentUnit(id)) ?? u.members[0]),
        memberIds: u.members,
        gen: u.gen,
      };
    });

  // ---- 11. Branches.
  const runY = (e: Edge) => tierY(e.gen) - clearOf(e.gen) - e.lane * G.lane;
  // Where each branch leaves its parents' vertical (a straight branch never turns).
  const sproutY = (e: Edge) => {
    const adx = Math.abs(e.xc - e.xs);
    return adx < 1 ? -Infinity : runY(e) + Math.min(adx, G.diagonal);
  };
  // Siblings share one rising line: only the branch that leaves it highest
  // carries the run up from the parents; the others sprout from it, so no
  // stretch of line is drawn twice (overlaps are meant to read as joints).
  const carriers = new Map<string, Edge>();
  for (const e of edges) {
    if (e.fromStem) continue;
    const key = `${e.parent.id}@${e.xs}`;
    const cur = carriers.get(key);
    if (!cur || sproutY(e) < sproutY(cur)) carriers.set(key, e);
  }
  const runs: LifeRun[] = [];
  const branches: LifeBranch[] = edges.map((e) => {
    // Children leave from the bar, wherever it runs.
    const ys = tierY(e.gen) - (lift.get(e.parent.id) ?? 0);
    const yc = tierY(e.gen + 1) + figureJoin(byId.get(e.childId)!, e.gen + 1);
    const yh = runY(e);
    const dx = e.xc - e.xs;
    const s = Math.sign(dx);
    const adx = Math.abs(dx);
    const sprouts = e.fromStem || carriers.get(`${e.parent.id}@${e.xs}`) !== e;
    let d: string;
    if (adx < 1) {
      d = `M${e.xs} ${ys} V${yc}`;
    } else {
      const dd = Math.min(adx, G.diagonal);
      const c2 = Math.min(adx - dd, G.chamfer);
      const start = sprouts ? `M${e.xs} ${yh + dd}` : `M${e.xs} ${ys} V${yh + dd}`;
      if (sprouts && !e.fromStem && ys > yh + dd + 0.5) {
        runs.push({
          id: `${e.parent.id}>${e.childId}:run`,
          d: `M${e.xs} ${ys} V${yh + dd}`,
          color: colorOf(e.parent.members[0]),
          parentIds: e.parent.members,
          childId: e.childId,
        });
      }
      d = `${start} L${e.xs + s * dd} ${yh} H${e.xc - s * c2} L${e.xc} ${yh - c2} V${yc}`;
    }
    return {
      id: `${e.parent.id}>${e.childId}`,
      d,
      color: e.fromStem ? colorOf(e.childId) : colorOf(e.parent.members[0]),
      gen: e.gen,
      parentIds: e.parent.members,
      childId: e.childId,
    };
  });

  // ---- 12. Stem, rose, girdle.
  const roseY = tierY(maxGen) - 200;
  /** Top edge of the girdle band along the ground. */
  const girdleY = Math.max(G.tier * 0.42, Math.max(...genMembers(0).map((m) => figureHalf(m, 0).h)) + 40);
  const trunk = { x: 0, top: roseY + 30, bottom: girdleY + G.girdleRail * G.girdleScale };

  // ---- 13. Chevrons on the stem, wherever it runs free. Each arm rises at
  // 45° and ends in one of the ornament's terminals: a prong, a cross or a comb.
  const obstacles: Seg[] = [...branches, ...bonds].flatMap((x) => pathSegs(x.d));
  const boxes = motifs.map((m) => {
    const hw = Math.max(m.half.w, m.label === 'above' ? G.labelWidth / 2 : 0) + 10;
    return {
      x1: m.x - hw - (m.label === 'left' ? G.sideLabel : 0),
      x2: m.x + hw + (m.label === 'right' ? G.sideLabel : 0),
      y1: m.y - m.top - G.labelBlock - 10,
      y2: m.y + m.half.h + 10,
    };
  });
  const A = G.leafArm;
  const leafLines = (y: number, i: number): { line: Pt[]; color: string }[] => {
    const out: { line: Pt[]; color: string }[] = [];
    for (const s of [-1, 1]) {
      const color = s < 0 ? PALETTE.forest : PALETTE.green;
      const e: Pt = [s * A, y - A];
      const kind = (['cross', 'comb', 'prong'] as const)[i % 3];
      if (kind === 'prong') out.push({ line: [[0, y], e, [e[0], e[1] - 28]], color });
      else if (kind === 'cross') {
        out.push({ line: [[0, y], e, [e[0], e[1] - 36]], color });
        out.push({ line: [[e[0] - 16, e[1] - 22], [e[0] + 16, e[1] - 22]], color });
      } else {
        out.push({ line: [[0, y], e], color });
        out.push({ line: [[(s * A) / 2, y - A / 2], [(s * A) / 2, y - A / 2 - 24]], color });
        out.push({ line: [e, [e[0], e[1] - 24]], color });
      }
    }
    return out;
  };
  const leafFits = (lines: { line: Pt[] }[]) =>
    lines
      .flatMap((l) => samplePolyline(l.line))
      .every(
        (p) =>
          obstacles.every((sg) => distToSeg(p, sg) >= G.stroke + 10) &&
          boxes.every((b) => p[0] < b.x1 || p[0] > b.x2 || p[1] < b.y1 || p[1] > b.y2),
      );
  const leaves: LifeLeaf[] = [];
  let lastY = Infinity;
  for (let y = Math.round(girdleY - 24); y - A - 40 > trunk.top + 60; y -= 8) {
    if (lastY - y < 112) continue;
    const lines = leafLines(y, leaves.length);
    if (!leafFits(lines)) continue;
    leaves.push({ y, lines: lines.map((l) => ({ d: polyD(l.line), color: l.color })) });
    lastY = y;
  }

  const bounds = {
    minX: Math.min(...boxes.map((b) => b.x1), -200) - 20,
    maxX: Math.max(...boxes.map((b) => b.x2), 200) + 20,
    minY: roseY - 80,
    maxY: girdleY + GIRDLE_WIDTH * G.girdleScale + 20,
  };

  return {
    motifs,
    branches,
    runs,
    bonds,
    // The stem stands on the girdle's upper rail.
    trunk,
    leaves,
    rose: { x: 0, y: roseY },
    girdleY,
    bounds,
    generations: maxGen + 1,
    rootSurname: rootPerson.data['last name'] ?? '',
  };
}

/** Ancestors, descendants and spouses of a member — the line lit on hover. */
export function lineageOf(id: string, members: FamilyMember[]): Set<string> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const out = new Set<string>([id]);
  const walk = (start: string, key: 'parents' | 'children') => {
    const stack = [start];
    while (stack.length) {
      const m = byId.get(stack.pop()!);
      for (const n of m?.rels[key] ?? []) if (byId.has(n) && !out.has(n)) (out.add(n), stack.push(n));
    }
  };
  walk(id, 'parents');
  walk(id, 'children');
  for (const s of byId.get(id)?.rels.spouses ?? []) if (byId.has(s)) out.add(s);
  return out;
}
