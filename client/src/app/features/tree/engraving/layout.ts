import { hierarchy, tree } from 'd3-hierarchy';
import { BranchSegment, HouseholdForest, PlacedMember, Point, TreeLayout } from './types';

export interface LayoutOptions {
  generationSpacing: number;
  personGap: number;
  trunkHeight: number;
  groundY: number;
  /** How far below the ground the founders' row sits, among the roots. */
  rootRowDepth: number;
  /** How far below the first row the trunk forks, so branches to that row rise instead of running flat. */
  forkDrop: number;
  /**
   * How much lower a household sits per unit² of horizontal distance from the trunk, so the crown reads
   * as a dome rather than a flat band. Capped at 0.85 of a generation.
   */
  crownDroop: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  generationSpacing: 190,
  personGap: 170,
  /** Tall enough that the first generation clears Ștefan and Molda at the trunk base. */
  trunkHeight: 480,
  groundY: 0,
  rootRowDepth: 135,
  forkDrop: 160,
  crownDroop: 0.00032,
};

/** Where along the parent's leader a side limb leaves it: [outermost, innermost] fraction of the leader. */
const TRUNK_ATTACH: [number, number] = [-0.6, 0.3];
const LIMB_ATTACH: [number, number] = [0.35, 0.6];

interface Node {
  id: string;
  size: number;
  children: Node[];
}

/**
 * Among three or more siblings, move the one with strictly the largest branch to the middle, so the
 * main line rises straight above its parents; the others keep their birth order around it.
 */
function centreMainBranch(
  ids: string[],
  descendants: (id: string) => number,
  side: (id: string) => 'start' | 'middle' | 'end' = () => 'middle',
): string[] {
  if (ids.length < 2) {
    return ids;
  }
  // a couple joining two founder families stands on the side facing the other family
  const sizes0 = ids.map(descendants);
  const max0 = Math.max(...sizes0);
  if (sizes0.filter((n) => n === max0).length === 1) {
    const main0 = ids[sizes0.indexOf(max0)];
    const towards = side(main0);
    if (towards !== 'middle') {
      const rest0 = ids.filter((id) => id !== main0);
      return towards === 'end' ? [...rest0, main0] : [main0, ...rest0];
    }
  }
  if (ids.length < 3) {
    return ids;
  }
  const sizes = ids.map(descendants);
  const max = Math.max(...sizes);
  if (sizes.filter((n) => n === max).length > 1) {
    return ids;
  }
  const main = ids[sizes.indexOf(max)];
  const rest = ids.filter((id) => id !== main);
  const middle = Math.floor(ids.length / 2);
  return [...rest.slice(0, middle), main, ...rest.slice(middle)];
}

/**
 * Positions households with a tidy-tree layout, then flips it so the founders sit in the roots
 * below the ground, their children at the top of the trunk, and each younger generation higher.
 */
export function layoutTree(forest: HouseholdForest, opts: Partial<LayoutOptions> = {}): TreeLayout {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...opts };
  const descendants = (id: string): number =>
    forest.households.get(id)!.childHouseholdIds.reduce((n, c) => n + 1 + descendants(c), 0);
  const rootIndex = new Map(forest.rootIds.map((id, i) => [id, i]));
  const toNode = (id: string, owner: number): Node => {
    const h = forest.households.get(id)!;
    const side = (child: string): 'start' | 'middle' | 'end' => {
      const other = forest.households.get(child)!.graftParentHouseholdIds.map((g) => rootIndex.get(g)).find((i) => i !== undefined);
      return other === undefined ? 'middle' : other > owner ? 'end' : 'start';
    };
    return {
      id,
      size: h.memberIds.length,
      children: centreMainBranch(h.childHouseholdIds, descendants, side).map((c) => toNode(c, owner)),
    };
  };
  const rowY = rowYFor(o);
  const weight = (id: string): number => {
    const h = forest.households.get(id)!;
    return h.memberIds.length + h.childHouseholdIds.reduce((n, c) => n + weight(c), 0);
  };

  const root = hierarchy<Node>({ id: '', size: 0, children: forest.rootIds.map((id, i) => toNode(id, i)) });
  tree<Node>()
    .nodeSize([o.personGap, o.generationSpacing])
    .separation((a, b) => ((a.data.size + b.data.size) / 2) * (a.parent === b.parent ? 1 : 1.25))(root);

  const founders = root.children ?? [];
  // the trunk stands under the main line: the first-generation household with strictly the most descendants
  const firstRow = founders.flatMap((f) => f.children ?? []);
  const rowSizes = firstRow.map((n) => descendants(n.data.id));
  const best = Math.max(-1, ...rowSizes);
  const main = rowSizes.filter((n) => n === best).length === 1 ? firstRow[rowSizes.indexOf(best)] : undefined;
  const trunkX = main ? main.x! : founders.length ? founders.reduce((s, n) => s + n.x!, 0) / founders.length : 0;
  const trunk = {
    base: { x: trunkX, y: o.groundY },
    top: { x: trunkX, y: o.groundY - o.trunkHeight + o.forkDrop },
  };

  const droop = (x: number) => Math.min(o.generationSpacing * 0.85, o.crownDroop * (x - trunkX) ** 2);
  const yAt = (generation: number, x: number) => rowY(generation) + (generation > 0 ? droop(x) : 0);

  const centers = new Map<string, Point>();
  const members: PlacedMember[] = [];
  const branches: BranchSegment[] = [];
  let generationCount = 0;

  for (const node of root.descendants().slice(1)) {
    const generation = node.depth - 1;
    generationCount = Math.max(generationCount, generation + 1);
    const center = { x: node.x!, y: yAt(generation, node.x!) };
    centers.set(node.data.id, center);
    const h = forest.households.get(node.data.id)!;
    h.memberIds.forEach((id, i) => {
      const offset = (i - (h.memberIds.length - 1) / 2) * o.personGap;
      members.push({ id, householdId: h.id, generation, center: { x: center.x + offset, y: center.y } });
    });
  }

  // founders hang from the trunk base by a root; the main child continues the trunk (the leader), and
  // its siblings leave that leader as side limbs at staggered heights, the outer ones lowest
  const from = new Map<string, Point>();
  for (const node of root.descendants().slice(1)) {
    const kids = node.children ?? [];
    if (!kids.length) {
      continue;
    }
    const start = node.depth === 1 ? trunk.top : centers.get(node.data.id)!;
    const sizes = kids.map((k) => descendants(k.data.id));
    const most = Math.max(...sizes);
    const leader = sizes.filter((n) => n === most).length === 1 ? kids[sizes.indexOf(most)] : undefined;
    if (!leader) {
      kids.forEach((k) => from.set(k.data.id, start));
      continue;
    }
    const end = centers.get(leader.data.id)!;
    const sides = kids.filter((k) => k !== leader);
    const reach = Math.max(1, ...sides.map((k) => Math.abs(k.x! - leader.x!)));
    const [outer, inner] = node.depth === 1 ? TRUNK_ATTACH : LIMB_ATTACH;
    from.set(leader.data.id, start);
    for (const k of sides) {
      const s = inner + (outer - inner) * (Math.abs(k.x! - leader.x!) / reach);
      from.set(k.data.id, { x: start.x + Math.max(0, s) * (end.x - start.x), y: start.y + s * (end.y - start.y) });
    }
  }
  for (const node of root.descendants().slice(1)) {
    const parentId = node.depth === 1 ? null : node.parent!.data.id;
    branches.push({
      id: `${parentId ?? 'trunk'}>${node.data.id}`,
      parentHouseholdId: parentId,
      childHouseholdId: node.data.id,
      from: parentId === null ? trunk.base : from.get(node.data.id)!,
      to: centers.get(node.data.id)!,
      generation: node.depth - 1,
      weight: weight(node.data.id),
    });
  }

  placeGrafts(forest, o, yAt, centers, members, branches, trunk.base, trunkX, new Set());

  // Centre the whole roots row (main founders and grafted lines) under the trunk.
  const rootRow = members.filter((m) => m.generation === 0);
  if (rootRow.length) {
    const xsRow = rootRow.map((m) => m.center.x);
    const shift = trunkX - (Math.min(...xsRow) + Math.max(...xsRow)) / 2;
    rootRow.forEach((m) => (m.center.x += shift));
    for (const id of new Set(rootRow.map((m) => m.householdId))) {
      centers.get(id)!.x += shift; // root links point at these same centre objects
    }
  }

  const xs = [trunkX, ...members.map((m) => m.center.x)];
  const ys = [o.groundY, ...members.map((m) => m.center.y)];
  return {
    members,
    branches,
    trunk,
    trunks: [trunk],
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    generationCount,
    unplacedMemberIds: [...forest.unplacedMemberIds],
  };
}

/** Founders (generation 0) sit in the roots; generation 1 at the top of the trunk; then upward. */
function rowYFor(o: LayoutOptions): (generation: number) => number {
  return (generation) =>
    generation === 0 ? o.groundY + o.rootRowDepth : o.groundY - o.trunkHeight - (generation - 1) * o.generationSpacing;
}

/**
 * Grafted ancestor lines (a spouse's parents) not handled elsewhere: one row below the couple, beyond the
 * right end of that row (the grafted spouse stands on the couple's right). In the founders' row they are
 * rooted at `rootBase`; higher up they get their own branch to the couple.
 */
function placeGrafts(
  forest: HouseholdForest,
  o: LayoutOptions,
  yAt: (g: number, x: number) => number,
  centers: Map<string, Point>,
  members: PlacedMember[],
  branches: BranchSegment[],
  rootBase: Point,
  fallbackX: number,
  skip: Set<string>,
): void {
  const generationOf = new Map(members.map((m) => [m.householdId, m.generation]));
  for (const rootId of forest.graftRootIds) {
    if (skip.has(rootId)) {
      continue;
    }
    const h = forest.households.get(rootId)!;
    const childId = h.graftChildHouseholdIds.find((c) => centers.has(c));
    if (!childId) {
      continue;
    }
    const generation = Math.max(0, generationOf.get(childId)! - 1);
    const rowMax = Math.max(-Infinity, ...members.filter((m) => m.generation === generation).map((m) => m.center.x));
    const n = h.memberIds.length;
    const cx = (Number.isFinite(rowMax) ? rowMax : fallbackX) + o.personGap + ((n - 1) / 2) * o.personGap;
    const y = yAt(generation, cx);
    const center = { x: cx, y };
    centers.set(rootId, center);
    generationOf.set(rootId, generation);
    h.memberIds.forEach((id, i) => {
      members.push({ id, householdId: rootId, generation, center: { x: cx + (i - (n - 1) / 2) * o.personGap, y } });
    });
    if (generation === 0) {
      branches.push({ id: `trunk>${rootId}`, parentHouseholdId: null, childHouseholdId: rootId, from: rootBase, to: center, generation: 0, weight: n });
      continue;
    }
    branches.push({
      id: `${rootId}>${childId}`,
      parentHouseholdId: rootId,
      childHouseholdId: childId,
      from: center,
      to: centers.get(childId)!,
      generation: generation + 1,
      graft: true,
      weight: n,
    });
  }
}
