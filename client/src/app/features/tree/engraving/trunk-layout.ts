import { DEFAULT_LAYOUT_OPTIONS, LayoutOptions } from './layout';
import { BANNER_BOTTOM, CLEAR_RISE, MEDALLION_TOP } from './medallion-geometry';
import { BranchSegment, Household, HouseholdForest, PlacedMember, Point, TreeLayout } from './types';

export type Gender = 'M' | 'F' | null | undefined;

/** What the layout needs to know about a member beyond their household. */
export interface MemberFacts {
  gender: (memberId: string) => Gender;
  parents: (memberId: string) => string[];
}

/** A member's box around its centre: portrait above, banner and years below. */
const BOX_TOP = MEDALLION_TOP;
const BOX_BOTTOM = BANNER_BOTTOM + 2;
/** Air kept between any two boxes. */
const GAP = 30;
/** Lowest a limb may leave the trunk, above the ground (clear of Ștefan and Molda at its foot). */
const TRUNK_FOOT = 260;
/** Angles (degrees above the horizontal) limbs leave at: the crown's fork, the line's own branches,
 * and brothers and sisters from the highest to the lowest. */
const CROWN_ANGLE = 48;
const LINE_ANGLE = 30;
const SIBLING_ANGLE: [number, number] = [26, 12];
/** Each generation along a limb turns this much more upward, so outer branches climb toward the light. */
const GEN_TURN = 16;
const MIN_ANGLE = 4;
const MAX_ANGLE = 78;
/** Angle between the outermost children of a fork. */
const FORK_SPREAD = 34;
/** How much further than the highest the lowest limb reaches out before its first household. */
const LOW_REACH = 1.2;
/** Shortest branch between two households along a limb. */
const MIN_STEP = 230;
/** Room a limb's first household keeps from the trunk's axis. */
const TRUNK_CLEAR = 110;
/** Where the trunk's wood ends below the couple sitting on it (their branch rises from there). */
const TRUNK_TOP_DROP = 140;

interface Box {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/** One limb: households in local coordinates, relative to where it leaves the trunk. */
interface Limb {
  side: number;
  roots: string[];
  /** Household centres relative to the attach point. */
  centres: Map<string, Point>;
  parentOf: Map<string, string | null>;
  boxes: Box[];
}

/**
 * The family tree grown around one couple: the couple with the most descendants (counting the family
 * of the spouse they married into) sits on a vertical trunk that rises on through their line of descent.
 * The father's family grows on one side and the mother's on the other: their parents in the roots, their
 * brothers and sisters as limbs leaving the trunk at 45° below the couple, each family's own line
 * carrying on outward and upward at 45°. Their descendants' other branches leave the trunk above them.
 *
 * Returns null when the family does not have that shape (no single main couple, or other founder
 * families not joined to it), so the caller can fall back to the plain layout.
 */
export function layoutTrunkTree(
  forest: HouseholdForest,
  opts: Partial<LayoutOptions> = {},
  facts: MemberFacts = { gender: () => undefined, parents: () => [] },
): TreeLayout | null {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...opts };
  const p = o.personGap;
  const H = (id: string): Household => forest.households.get(id)!;
  const descendants = (id: string): number => H(id).childHouseholdIds.reduce((n, c) => n + 1 + descendants(c), 0);
  const people = (id: string): number => H(id).memberIds.length + H(id).childHouseholdIds.reduce((n, c) => n + people(c), 0);

  // ---- The main couple: most descendants, the family they joined counting too.
  const firstRow = forest.rootIds.flatMap((r) => H(r).childHouseholdIds);
  if (!firstRow.length) {
    return null;
  }
  const joined = (id: string) => H(id).graftParentHouseholdIds.find((g) => forest.rootIds.includes(g) || forest.graftRootIds.includes(g));
  const score = (id: string) => {
    const g = joined(id);
    return descendants(id) + (g ? people(g) : 0);
  };
  const scores = firstRow.map(score);
  const best = Math.max(...scores);
  if (scores.filter((s) => s === best).length !== 1) {
    return null;
  }
  const couple = firstRow[scores.indexOf(best)];
  const fatherLine = H(couple).parentHouseholdId!;
  const motherLine = joined(couple);
  // Any other founder family, or another spouse's parents elsewhere, does not fit this shape.
  const allowedRoots = new Set([fatherLine, motherLine].filter(Boolean));
  if (forest.rootIds.some((r) => !allowedRoots.has(r)) || forest.graftRootIds.some((r) => !allowedRoots.has(r))) {
    return null;
  }
  if ([...forest.households.values()].some((h) => h.id !== couple && h.graftParentHouseholdIds.length)) {
    return null;
  }

  // The blood line the couple's parents household is named for: on the right if that is the father's.
  const childOf = (m: string, household: string) => facts.parents(m).some((q) => H(household).memberIds.includes(q));
  const anchor = H(couple).memberIds.find((m) => childOf(m, fatherLine)) ?? H(couple).memberIds[0];
  const fatherSide = facts.gender(anchor) === 'F' ? -1 : 1;

  // ---- The trunk's line: from the couple up through the heaviest line while it branches on.
  const spine = [couple];
  for (;;) {
    const kids = H(spine[spine.length - 1]).childHouseholdIds;
    const next = [...kids].sort((a, b) => people(b) - people(a))[0];
    if (!next || !H(next).childHouseholdIds.length) break;
    spine.push(next);
  }
  const onSpine = new Set(spine);

  // ---- Which side each limb grows on. Brothers and sisters follow their parent's side; the
  // couple's descendants balance the two sides by weight.
  let weightL = 0;
  let weightR = 0;
  const add = (side: number, id: string) => (side < 0 ? (weightL += people(id)) : (weightR += people(id)));
  const fatherSibs = H(fatherLine).childHouseholdIds.filter((c) => c !== couple);
  const motherSibs = motherLine ? H(motherLine).childHouseholdIds.filter((c) => c !== couple) : [];
  const siblings: { id: string; side: number; parent: string }[] = [];
  if (motherLine) {
    fatherSibs.forEach((id) => siblings.push({ id, side: fatherSide, parent: fatherLine }));
    motherSibs.forEach((id) => siblings.push({ id, side: -fatherSide, parent: motherLine }));
  } else {
    for (const id of [...fatherSibs].sort((a, b) => people(b) - people(a))) {
      siblings.push({ id, side: weightL <= weightR ? -1 : 1, parent: fatherLine });
      add(siblings[siblings.length - 1].side, id);
    }
  }
  if (motherLine) siblings.forEach((s) => add(s.side, s.id));
  const levelSides = spine.map((id, k) => {
    const kids = H(id).childHouseholdIds.filter((c) => !onSpine.has(c));
    const left: string[] = [];
    const right: string[] = [];
    if (k === spine.length - 1) {
      // the crown forks both ways, eldest to the left
      kids.forEach((c, i) => (i % 2 ? right : left).push(c));
      return { left, right };
    }
    for (const c of [...kids].sort((a, b) => people(b) - people(a))) {
      const side = weightL < weightR ? -1 : weightR < weightL ? 1 : left.length <= right.length ? -1 : 1;
      (side < 0 ? left : right).push(c);
      add(side, c);
    }
    // keep birth order within a side
    const order = (list: string[]) => list.sort((a, b) => kids.indexOf(a) - kids.indexOf(b));
    return { left: order(left), right: order(right) };
  });

  // ---- Geometry.
  const step = Math.max(280, p + 40);
  const width = (id: string) => H(id).memberIds.length * p;
  const boxAt = (id: string, c: Point): Box => ({
    x1: c.x - width(id) / 2,
    x2: c.x + width(id) / 2,
    y1: c.y - BOX_TOP,
    y2: c.y + BOX_BOTTOM,
  });

  /**
   * A limb grows out at `angle` degrees above the horizontal. At each household it forks: its children
   * fan out at their own angles (the lowest flattest, reaching furthest out), each turning a little
   * more upward than its parent, so outer branches climb toward the light and the crown reads as a
   * broad dome. The limb lengthens until none of its households touch.
   */
  const buildLimb = (roots: string[], side: number, angle: number, reach = 1): Limb => {
    const parentOf = new Map<string, string | null>();
    const angleOf = new Map<string, number>();
    const depthOf = new Map<string, number>();
    const visit = (id: string, parent: string | null, deg: number, depth: number) => {
      parentOf.set(id, parent);
      angleOf.set(id, deg);
      depthOf.set(id, depth);
      const kids = H(id).childHouseholdIds;
      kids.forEach((c, i) => {
        const fan = kids.length > 1 ? FORK_SPREAD * (i / (kids.length - 1) - 0.5) * Math.min(2, kids.length - 1) : 0;
        visit(c, id, Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, deg + GEN_TURN + fan)), depth + 1);
      });
    };
    roots.forEach((r, i) => {
      const fan = roots.length > 1 ? FORK_SPREAD * (i / (roots.length - 1) - 0.5) * Math.min(2, roots.length - 1) : 0;
      visit(r, null, Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle + fan)), 1);
    });
    const ids = [...parentOf.keys()];
    const first = (id: string) => (width(id) / 2 + TRUNK_CLEAR) / Math.cos((angleOf.get(id)! * Math.PI) / 180);

    // Each branch starts just long enough for its household to clear its parents' (side by side or
    // one above the other, whichever its angle reaches sooner); only branches that still run into
    // another household are lengthened, so the rest of the limb stays compact.
    const rad = (id: string) => (angleOf.get(id)! * Math.PI) / 180;
    const length = new Map<string, number>();
    for (const id of ids) {
      const up = parentOf.get(id);
      if (!up) {
        length.set(id, Math.max(step, first(id)) * reach);
        continue;
      }
      const a = rad(id);
      const sideBySide = ((width(up) + width(id)) / 2 + GAP) / Math.max(0.05, Math.cos(a));
      const above = (BOX_TOP + BOX_BOTTOM + GAP) / Math.max(0.05, Math.sin(a));
      length.set(id, Math.max(MIN_STEP, Math.min(sideBySide, above)));
    }
    const place = () => {
      const centres = new Map<string, Point>();
      const at = (id: string): Point => {
        const known = centres.get(id);
        if (known) return known;
        const up = parentOf.get(id);
        const from = up ? at(up) : { x: 0, y: 0 };
        const a = rad(id);
        const len = length.get(id)!;
        const c = { x: from.x + side * len * Math.cos(a), y: from.y - len * Math.sin(a) };
        centres.set(id, c);
        return c;
      };
      ids.forEach(at);
      return centres;
    };
    const touching = (a: Box, b: Box) => a.x1 < b.x2 + GAP && b.x1 < a.x2 + GAP && a.y1 < b.y2 + GAP && b.y1 < a.y2 + GAP;
    let centres = place();
    for (let round = 0; round < 80; round++) {
      const longer = new Set<string>();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          if (!touching(boxAt(ids[i], centres.get(ids[i])!), boxAt(ids[j], centres.get(ids[j])!))) continue;
          // brothers and sisters both reach a little further, staying balanced; otherwise lengthen
          // the deeper one's own branch (the later-born of two at the same depth)
          if (parentOf.get(ids[i]) === parentOf.get(ids[j])) {
            longer.add(ids[i]);
            longer.add(ids[j]);
          } else {
            longer.add(depthOf.get(ids[j])! >= depthOf.get(ids[i])! ? ids[j] : ids[i]);
          }
        }
      }
      if (!longer.size) break;
      longer.forEach((id) => length.set(id, length.get(id)! * 1.06));
      centres = place();
    }
    return { side, roots, centres, parentOf, boxes: ids.map((id) => boxAt(id, centres.get(id)!)) };
  };

  /** Lowest shift ≥ `from` at which `boxes` clear every placed box. */
  const placed: Box[] = [];
  const drop = (boxes: Box[], from: number): number => {
    const blocked: [number, number][] = [];
    for (const b of boxes) {
      for (const q of placed) {
        if (b.x1 < q.x2 + GAP && q.x1 < b.x2 + GAP) {
          blocked.push([q.y1 - GAP - b.y2, q.y2 + GAP - b.y1]);
        }
      }
    }
    let y = from;
    for (let moved = true; moved; ) {
      moved = false;
      for (const [lo, hi] of blocked) {
        if (y > lo && y < hi) {
          y = hi;
          moved = true;
        }
      }
    }
    return y;
  };
  const shifted = (boxes: Box[], dy: number) => boxes.map((b) => ({ ...b, y1: b.y1 + dy, y2: b.y2 + dy }));

  const centres = new Map<string, Point>();
  const branches: BranchSegment[] = [];
  const limbs: { limb: Limb; attach: number; parent: string; fork: boolean }[] = [];
  const spineY: number[] = new Array(spine.length);

  const placeLimb = (roots: string[], side: number, from: number, parent: string, angle: number, fork = false, reach = 1): number => {
    const limb = buildLimb(roots, side, angle, reach);
    const attach = fork ? from : drop(limb.boxes, from);
    placed.push(...shifted(limb.boxes, attach));
    limbs.push({ limb, attach, parent, fork });
    return attach;
  };

  // From the crown down: the top couple's children fork out of it at the top; each couple below sits
  // under the limbs leaving the trunk above it.
  const top = spine.length - 1;
  spineY[top] = 0;
  placed.push(boxAt(spine[top], { x: 0, y: 0 }));
  for (const side of [-1, 1]) {
    const kids = side < 0 ? levelSides[top].left : levelSides[top].right;
    if (kids.length) placeLimb(kids, side, -CLEAR_RISE, spine[top], CROWN_ANGLE, true);
  }
  let lowest = -Infinity;
  for (let k = top - 1; k >= 0; k--) {
    // limbs leave the trunk below the couple above, passing under their banners
    const below = spineY[k + 1] + BOX_BOTTOM + width(spine[k + 1]) / 2 + 10;
    let lowestHere = below;
    for (const side of [-1, 1]) {
      // the youngest highest, the eldest lowest, as on a real tree
      const kids = [...(side < 0 ? levelSides[k].left : levelSides[k].right)].reverse();
      let from = below;
      for (const id of kids) {
        from = placeLimb([id], side, from, spine[k], LINE_ANGLE);
        lowestHere = Math.max(lowestHere, from);
      }
    }
    const y = drop([boxAt(spine[k], { x: 0, y: 0 })], Math.max(spineY[k + 1] + o.generationSpacing, lowestHere + CLEAR_RISE + 20));
    spineY[k] = y;
    placed.push(boxAt(spine[k], { x: 0, y }));
  }
  // Brothers and sisters leave the trunk below the couple.
  const below = spineY[0] + BOX_BOTTOM + width(couple) / 2 + 10;
  const sideLimbs = new Map<number, typeof limbs>();
  for (const side of [-1, 1]) {
    let from = below;
    const list = siblings.filter((s) => s.side === side);
    // the youngest highest, the eldest lowest
    const ordered = [...list].sort((a, b) => H(b.parent).childHouseholdIds.indexOf(b.id) - H(a.parent).childHouseholdIds.indexOf(a.id));
    const start = limbs.length;
    for (const [i, s] of ordered.entries()) {
      // the lowest limbs spread flattest and reach furthest before their first household, so the
      // crown widens into a dome at its base while each limb's own households stay close together
      const low = ordered.length > 1 ? i / (ordered.length - 1) : 0;
      const angle = SIBLING_ANGLE[0] - (SIBLING_ANGLE[0] - SIBLING_ANGLE[1]) * low;
      from = placeLimb([s.id], side, from, s.parent, angle, false, 1 + LOW_REACH * low);
      lowest = Math.max(lowest, from);
    }
    sideLimbs.set(side, limbs.slice(start));
  }
  // The side with fewer limbs spreads them down the trunk, so both sides reach toward the ground
  // instead of one hanging high above it. Each moves a little more than the one above it, so the
  // gaps only widen and nothing it cleared comes closer.
  for (const list of sideLimbs.values()) {
    const extra = list.length ? lowest - list[list.length - 1].attach : 0;
    list.forEach((entry, i) => (entry.attach += (extra * (i + 1)) / list.length));
  }

  const groundY = Math.max(spineY[0] + o.trunkHeight, lowest + TRUNK_FOOT);
  const dy = o.groundY - groundY;

  // ---- Households and branches, in world coordinates.
  spine.forEach((id, k) => centres.set(id, { x: 0, y: spineY[k] + dy }));
  for (const { limb, attach } of limbs) {
    for (const [id, c] of limb.centres) centres.set(id, { x: c.x, y: c.y + attach + dy });
  }
  const rootY = o.groundY + o.rootRowDepth;
  const rootX = (id: string, side: number) => side * (width(id) / 2 + p * 0.6);
  centres.set(fatherLine, { x: rootX(fatherLine, fatherSide), y: rootY });
  if (motherLine) centres.set(motherLine, { x: rootX(motherLine, -fatherSide), y: rootY });

  const trunk = {
    base: { x: 0, y: o.groundY },
    top: { x: 0, y: spineY[0] + dy + TRUNK_TOP_DROP },
  };
  const generationOf = new Map<string, number>();
  const setGen = (id: string, g: number) => {
    generationOf.set(id, g);
    H(id).childHouseholdIds.forEach((c) => setGen(c, g + 1));
  };
  setGen(fatherLine, 0);
  if (motherLine) setGen(motherLine, 0);

  const push = (parent: string | null, child: string, from: Point, extra: Partial<BranchSegment> = {}) =>
    branches.push({
      id: `${parent ?? 'trunk'}>${child}`,
      parentHouseholdId: parent,
      childHouseholdId: child,
      from,
      to: centres.get(child)!,
      generation: generationOf.get(child)!,
      weight: people(child),
      ...extra,
    });
  // roots, then the trunk's couple, then up the trunk's line
  push(null, fatherLine, trunk.base);
  if (motherLine) push(null, motherLine, trunk.base);
  push(fatherLine, couple, trunk.top);
  for (let k = 1; k < spine.length; k++) push(spine[k - 1], spine[k], centres.get(spine[k - 1])!, { rise: CLEAR_RISE });
  for (const { limb, attach, parent, fork } of limbs) {
    for (const [id] of limb.centres) {
      const up = limb.parentOf.get(id);
      if (up) {
        push(up, id, centres.get(up)!, { rise: CLEAR_RISE });
      } else if (fork) {
        push(parent, id, centres.get(parent)!, { rise: CLEAR_RISE });
      } else {
        push(parent, id, { x: 0, y: attach + dy });
      }
    }
  }

  // ---- Members: the main couple's partners each stand on their own family's side.
  const members: PlacedMember[] = [];
  for (const [id, c] of centres) {
    let ids = H(id).memberIds;
    if (id === couple && motherLine) {
      const mother = ids.filter((m) => childOf(m, motherLine));
      const rest = ids.filter((m) => !mother.includes(m));
      ids = fatherSide > 0 ? [...mother, ...rest] : [...rest, ...mother];
    }
    const n = ids.length;
    ids.forEach((m, i) =>
      members.push({ id: m, householdId: id, generation: generationOf.get(id)!, center: { x: c.x + (i - (n - 1) / 2) * p, y: c.y } }),
    );
  }
  const xs = [0, ...members.map((m) => m.center.x)];
  const ys = [o.groundY, ...members.map((m) => m.center.y)];
  return {
    members,
    branches,
    trunk,
    trunks: [trunk],
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    generationCount: Math.max(...generationOf.values()) + 1,
    unplacedMemberIds: [...forest.unplacedMemberIds],
  };
}
