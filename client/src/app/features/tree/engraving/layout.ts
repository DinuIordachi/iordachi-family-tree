import { hierarchy, tree } from 'd3-hierarchy';
import { BranchSegment, HouseholdForest, PlacedMember, Point, TreeLayout } from './types';

export interface LayoutOptions {
  generationSpacing: number;
  personGap: number;
  trunkHeight: number;
  groundY: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  generationSpacing: 190,
  personGap: 170,
  trunkHeight: 220,
  groundY: 0,
};

interface Node {
  id: string;
  size: number;
  children: Node[];
}

/**
 * Positions households with a tidy-tree layout, then flips it so the
 * founders sit on the trunk and each younger generation is higher.
 */
export function layoutTree(forest: HouseholdForest, opts: Partial<LayoutOptions> = {}): TreeLayout {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...opts };
  const toNode = (id: string): Node => {
    const h = forest.households.get(id)!;
    return { id, size: h.memberIds.length, children: h.childHouseholdIds.map(toNode) };
  };
  const root = hierarchy<Node>({ id: '', size: 0, children: forest.rootIds.map(toNode) });
  tree<Node>()
    .nodeSize([o.personGap, o.generationSpacing])
    .separation((a, b) => ((a.data.size + b.data.size) / 2) * (a.parent === b.parent ? 1 : 1.25))(root);

  const founders = root.children ?? [];
  const trunkX = founders.length ? founders.reduce((s, n) => s + n.x!, 0) / founders.length : 0;
  const trunk = { base: { x: trunkX, y: o.groundY }, top: { x: trunkX, y: o.groundY - o.trunkHeight } };

  const centers = new Map<string, Point>();
  const members: PlacedMember[] = [];
  const branches: BranchSegment[] = [];
  let generationCount = 0;

  for (const node of root.descendants().slice(1)) {
    const generation = node.depth - 1;
    generationCount = Math.max(generationCount, generation + 1);
    const center = { x: node.x!, y: o.groundY - o.trunkHeight - generation * o.generationSpacing };
    centers.set(node.data.id, center);
    const h = forest.households.get(node.data.id)!;
    h.memberIds.forEach((id, i) => {
      const offset = (i - (h.memberIds.length - 1) / 2) * o.personGap;
      members.push({ id, householdId: h.id, generation, center: { x: center.x + offset, y: center.y } });
    });
  }

  for (const node of root.descendants().slice(1)) {
    const parentId = node.depth === 1 ? null : node.parent!.data.id;
    branches.push({
      id: `${parentId ?? 'trunk'}>${node.data.id}`,
      parentHouseholdId: parentId,
      childHouseholdId: node.data.id,
      from: parentId ? centers.get(parentId)! : trunk.top,
      to: centers.get(node.data.id)!,
      generation: node.depth - 1,
    });
  }

  const xs = [trunkX, ...members.map((m) => m.center.x)];
  const ys = [o.groundY, ...members.map((m) => m.center.y)];
  return {
    members,
    branches,
    trunk,
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    generationCount,
    unplacedMemberIds: [...forest.unplacedMemberIds],
  };
}
