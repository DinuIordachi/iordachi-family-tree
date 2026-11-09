import { hierarchy, HierarchyPointNode, tree } from 'd3-hierarchy';
import { FamilyMember } from '@app/core/models';

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

/** The eight brand colours (RGB values from the guide's colour palette page). */
export const PALETTE = {
  orange: '#E65D31',
  red: '#D5002F',
  wine: '#940144',
  magenta: '#B94676',
  green: '#34871D',
  forest: '#006C50',
  blue: '#1B7396',
  black: '#000000',
} as const;

/** Colours branches cycle through; green is reserved for the central stem. */
export const BRANCH_COLORS = [
  PALETTE.orange,
  PALETTE.red,
  PALETTE.magenta,
  PALETTE.blue,
  PALETTE.wine,
  PALETTE.forest,
] as const;

/** Folk elements of the symbol, assigned one per generation (oldest first). */
export const MOTIFS = ['basil', 'glass', 'fruit', 'connectivity', 'star', 'chip', 'textile', 'heart'] as const;
export type MotifKind = (typeof MOTIFS)[number];

export const GEOMETRY = {
  tier: 270,
  coupleSpacing: 128,
  labelWidth: 112,
  unitGap: 34,
  trunkClear: 92,
  blockGap: 120,
  motifRadius: 28,
  labelClear: 78,
  lane: 20,
  diagonal: 36,
  chamfer: 18,
} as const;

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
}

export interface LifeBranch {
  id: string;
  d: string;
  color: string;
  gen: number;
  parentIds: string[];
  childId: string;
}

export interface LifeBond {
  id: string;
  x1: number;
  x2: number;
  y: number;
  color: string;
  memberIds: string[];
  gen: number;
}

export interface LifeLayout {
  motifs: LifeMotif[];
  branches: LifeBranch[];
  bonds: LifeBond[];
  trunk: { x: number; top: number; bottom: number };
  leaves: { y: number }[];
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

export function layoutLife(members: FamilyMember[]): LifeLayout {
  const G = GEOMETRY;
  const byId = new Map(members.map((m) => [m.id, m]));
  const rel = (m: FamilyMember, k: keyof FamilyMember['rels']) => m.rels[k].filter((id) => byId.has(id));

  const empty: LifeLayout = {
    motifs: [],
    branches: [],
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

  // Main line: founders sit on the stem; their children alternate left/right
  // (eldest nearest the stem) so the stem stays clear all the way to the rose.
  // Sides are balanced by weight, counting the families that will hang off
  // each line, so the stem stays near the middle of the crown.
  const subtree = (u: Unit): Unit[] => [u, ...u.children.flatMap(subtree)];
  const blockUnits = (b: number) => units.filter((u) => u.block === b);
  const weight = (c: Unit): number => {
    const own = new Set(subtree(c));
    let w = own.size;
    for (let b = 1; b < blockRoots.length; b++) {
      const list = blockUnits(b);
      if (list.some((u) => childrenOf(u).some((ch) => own.has(unitOf.get(ch.id)!)))) w += list.length;
    }
    return w;
  };
  const left: Unit[] = [];
  const right: Unit[] = [];
  let lw = 0;
  let rw = 0;
  for (const c of [...rootUnit.children].sort((a, b) => weight(b) - weight(a))) {
    if (lw <= rw) (left.push(c), (lw += weight(c)));
    else (right.push(c), (rw += weight(c)));
  }
  const order = (list: Unit[]) => list.sort((a, b) => rootUnit.children.indexOf(a) - rootUnit.children.indexOf(b));
  order(left);
  order(right);
  const leftPlaced = layoutForest([...left].reverse());
  const rightPlaced = layoutForest(right);
  const { hi: leftHi } = extent(leftPlaced);
  const { lo: rightLo } = extent(rightPlaced);
  shift(leftPlaced, -G.trunkClear - Math.max(...[...leftHi.values()], -Infinity));
  shift(rightPlaced, G.trunkClear - Math.min(...[...rightLo.values()], Infinity));
  rootUnit.x = 0;
  const placed: Unit[] = [rootUnit, ...leftPlaced, ...rightPlaced];

  // Other families hang on the outer side of the member they married into.
  for (const root of blockRoots.slice(1)) {
    const block = layoutForest([root]);
    const blockIds = new Set(block.map((u) => u.id));
    const anchors = block
      .flatMap((u) => childrenOf(u))
      .map((c) => unitOf.get(c.id)!)
      .filter((u) => !blockIds.has(u.id) && placed.includes(u));
    const side = anchors.length ? Math.sign(anchors.reduce((s, u) => s + u.x, 0)) || 1 : 1;
    const ex = extent(placed);
    const bx = extent(block);
    let dx = side < 0 ? Infinity : -Infinity;
    for (const g of new Set(block.map((u) => u.gen))) {
      const outer = side < 0 ? Math.min(...ex.lo.values()) : Math.max(...ex.hi.values());
      const edge = side < 0 ? (ex.lo.get(g) ?? outer) : (ex.hi.get(g) ?? outer);
      dx = side < 0 ? Math.min(dx, edge - G.blockGap - bx.hi.get(g)!) : Math.max(dx, edge + G.blockGap - bx.lo.get(g)!);
    }
    shift(block, dx);
    placed.push(...block);
  }

  // ---- 5. Member order inside a unit: blood relative toward the stem,
  // anyone whose own parents hang further out on the outer side.
  const pos = new Map<string, { x: number; y: number }>();
  const tierY = (g: number) => 0 - g * G.tier;
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
    ordered.forEach((id, i) =>
      pos.set(id, { x: u.x + (i - (ordered.length - 1) / 2) * G.coupleSpacing, y: tierY(u.gen) }),
    );
  }

  // ---- 6. Colours: each line from the founders keeps one branch colour.
  const lineColor = new Map<string, string>();
  const paint = (u: Unit, color: string) => {
    u.members.forEach((id) => lineColor.set(id, color));
    u.children.forEach((c) => paint(c, color));
  };
  rootUnit.members.forEach((id) => lineColor.set(id, PALETTE.green));
  rootUnit.children.forEach((c, i) => paint(c, BRANCH_COLORS[i % (BRANCH_COLORS.length - 1)]));
  blockRoots.slice(1).forEach((r) => paint(r, PALETTE.forest));
  const colorOf = (id: string) => lineColor.get(id) ?? PALETTE.blue;

  // ---- 7. Motifs.
  const motifs: LifeMotif[] = [];
  for (const u of placed) {
    u.members.forEach((id) => {
      const m = byId.get(id)!;
      const p = pos.get(id)!;
      // Blood relatives wear their line's colour, spouses a companion colour.
      // Someone whose parents belong to another family wears that family's line.
      const pu = parentUnit(id);
      const married = pu && pu.block !== u.block;
      const blood = !!pu || blockRoots.some((r) => r.members[0] === id);
      const own = married ? colorOf(pu.members[0]) : colorOf(id);
      const line = own === PALETTE.green ? PALETTE.red : own;
      const idx = BRANCH_COLORS.indexOf(line as (typeof BRANCH_COLORS)[number]);
      const companion = BRANCH_COLORS[(idx + 3) % BRANCH_COLORS.length];
      motifs.push({
        id,
        member: m,
        x: p.x,
        y: p.y,
        gen: u.gen,
        motif: MOTIFS[u.gen % MOTIFS.length],
        color: blood ? line : companion,
        accent: PALETTE.green,
        deceased: m.deceased,
      });
    });
  }

  // ---- 8. Marriage bonds.
  const bonds: LifeBond[] = placed
    .filter((u) => u.members.length > 1)
    .map((u) => {
      const xs = u.members.map((id) => pos.get(id)!.x);
      return {
        id: u.id,
        x1: Math.min(...xs),
        x2: Math.max(...xs),
        y: tierY(u.gen),
        color: u === rootUnit ? PALETTE.green : colorOf(u.members.find((id) => parentUnit(id)) ?? u.members[0]),
        memberIds: u.members,
        gen: u.gen,
      };
    });

  // ---- 9. Branches with lane assignment per generation gap.
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
    const parents = rel(m, 'parents').filter((p) => pu.members.includes(p));
    const px = parents.map((p) => pos.get(p)!.x);
    edges.push({
      childId: m.id,
      parent: pu,
      xs: pu === rootUnit ? 0 : px.reduce((a, b) => a + b, 0) / px.length,
      xc: pos.get(m.id)!.x,
      gen: pu.gen,
      fromStem: pu === rootUnit,
      lane: 0,
    });
  }
  const gaps = new Map<number, Edge[]>();
  edges.forEach((e) => gaps.set(e.gen, [...(gaps.get(e.gen) ?? []), e]));
  for (const list of gaps.values()) {
    const lanes: Edge[][] = [];
    list.sort((a, b) => Math.abs(b.xc - b.xs) - Math.abs(a.xc - a.xs));
    for (const e of list) {
      const lo = Math.min(e.xs, e.xc);
      const hi = Math.max(e.xs, e.xc);
      let k = 0;
      for (; k < lanes.length; k++) {
        const clash = lanes[k].some((o) => {
          const pad = o.xs === e.xs && Math.sign(o.xc - o.xs) !== Math.sign(e.xc - e.xs) ? -1 : 16;
          return lo < Math.max(o.xs, o.xc) + pad && Math.min(o.xs, o.xc) < hi + pad;
        });
        if (!clash) break;
      }
      (lanes[k] ??= []).push(e);
      e.lane = k;
    }
  }
  const branches: LifeBranch[] = edges.map((e) => {
    const ys = tierY(e.gen);
    const yc = tierY(e.gen + 1) + G.motifRadius;
    const yh = ys - G.labelClear - e.lane * G.lane;
    const dx = e.xc - e.xs;
    const s = Math.sign(dx);
    const adx = Math.abs(dx);
    let d: string;
    if (adx < 1) {
      d = `M${e.xs} ${ys} V${yc}`;
    } else {
      const dd = Math.min(adx, G.diagonal);
      const c2 = Math.min(adx - dd, G.chamfer);
      const start = e.fromStem ? `M${e.xs} ${yh + dd}` : `M${e.xs} ${ys} V${yh + dd}`;
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

  // ---- 10. Stem, leaves, rose, girdle, bounds.
  const maxGen = Math.max(...units.map((u) => u.gen));
  const roseY = tierY(maxGen) - G.tier * 0.7;
  const leaves: { y: number }[] = [];
  for (let g = 1; g <= maxGen; g++) leaves.push({ y: tierY(g) + 30 }, { y: tierY(g) - G.tier / 2 + 20 });
  leaves.push({ y: tierY(maxGen) - G.tier * 0.32 });
  const girdleY = G.tier * 0.42;
  const xs = motifs.map((m) => m.x);
  const bounds = {
    minX: Math.min(...xs, -200) - G.labelWidth,
    maxX: Math.max(...xs, 200) + G.labelWidth,
    minY: roseY - 80,
    maxY: girdleY + 50,
  };

  return {
    motifs,
    branches,
    bonds,
    trunk: { x: 0, top: roseY + 30, bottom: girdleY },
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
