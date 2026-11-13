import { seededRandom } from './seeded-random';
import { fmt, pt } from './sketch';
import { Point, TreeLayout } from './types';
import { hangPoint } from './wood';

/** An area kept free of leaves so a medallion, banner or ornament stays legible. */
export type Clearing =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number };

export interface FoliageOptions {
  seed: number;
  clearings: Clearing[];
  /** Upper bound on engraved leaves; spacing grows on large trees to respect it. */
  maxLeaves?: number;
  /** Tips of decorative side branches: each gathers a tuft of leaves too. */
  extraTips?: Point[];
}

export interface Foliage {
  /** Outlined leaves on lit and half-lit surfaces (stroke only). */
  lit: string;
  /** Filled leaves in the shadowed parts of each leaf mass. */
  shade: string;
  /** A few filled leaves in a lighter tone, catching the light. */
  light: string;
  /** Short dark engraving strokes between shadowed leaves. */
  hatch: string;
  /** The crown's one continuous, softly scalloped silhouette behind the leaves, drawn semi-transparent. */
  canopy: string;
  leafCount: number;
  /** Whether a point lies inside the crown's silhouette (where the lesser wood may grow). */
  contains: (p: Point) => boolean;
}

interface Lobe {
  x: number;
  y: number;
  r: number;
  /** 0 at the trunk's axis, 1 at the crown's outer edge: leaves are densest out there. */
  out: number;
}

/** Light falls from the upper left, as in the reference engravings. */
const LIGHT = { x: -0.55, y: -0.83 };
const LEAF_LENGTH = 10;
const LEAF_WIDTH = 3.4;
const MIN_SPACING = 9;
/** Share of leaves near the trunk compared with the crown's edge. */
const INNER_DENSITY = 0.18;

export function insideClearing(p: Point, c: Clearing): boolean {
  if (c.kind === 'ellipse') {
    return ((p.x - c.cx) / c.rx) ** 2 + ((p.y - c.cy) / c.ry) ** 2 <= 1;
  }
  return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h;
}

/**
 * Leaf masses where real leaves grow: at the twig tips each household hangs from (larger toward the
 * crown's edge), along the outer part of each branch, and over the top of the crown, ringed with
 * scallops. None along the trunk below the crown, which stays bare wood.
 */
function canopyLobes(layout: TreeLayout, rnd: () => number, extraTips: Point[] = []): Lobe[] {
  const axis = layout.trunk.base.x;
  const crownBase = layout.trunk.top.y;
  const aboveGround = layout.members.filter((m) => m.center.y < layout.trunk.base.y);
  const reach = Math.max(1, ...aboveGround.map((m) => Math.abs(m.center.x - axis)));
  const outOf = (x: number) => Math.min(1, Math.abs(x - axis) / reach);
  const bare = (p: Point, r: number) => p.y > crownBase && Math.abs(p.x - axis) < r * 0.6 + 90;

  const lobes: Lobe[] = [];
  const households = new Map<string, Point[]>();
  for (const m of aboveGround) households.set(m.householdId, [...(households.get(m.householdId) ?? []), m.center]);
  const hasChildren = new Set(layout.branches.map((b) => b.parentHouseholdId));
  const topY = Math.min(...aboveGround.map((m) => m.center.y));
  for (const [id, people] of households) {
    const centre = { x: people.reduce((s, p) => s + p.x, 0) / people.length, y: people[0].y };
    const tip = hangPoint(centre);
    const out = outOf(tip.x);
    const r = (64 + 120 * out) * (hasChildren.has(id) ? 1 : 1.25);
    // the mass sits a little beyond the twig, out toward the light
    const side = Math.sign(tip.x - axis);
    const at = { x: tip.x + side * r * 0.25, y: tip.y - r * 0.25 };
    if (!bare(at, r)) lobes.push({ ...at, r, out });
    if (centre.y === topY) lobes.push({ x: centre.x + (rnd() - 0.5) * 60, y: tip.y - 140, r: 120 + rnd() * 30, out: 1 });
  }
  for (const b of layout.branches) {
    if (b.parentHouseholdId === null) continue;
    for (const t of [0.6, 0.85]) {
      const p = { x: b.from.x + (b.to.x - b.from.x) * t, y: b.from.y + (b.to.y - b.from.y) * t - 120 };
      const out = outOf(p.x);
      const r = 40 + 70 * out;
      if (!bare(p, r) && out > 0.2) lobes.push({ ...p, r, out });
    }
  }
  for (const tip of extraTips) {
    const out = outOf(tip.x);
    const r = 46 + 60 * out;
    lobes.push({ x: tip.x, y: tip.y - r * 0.2, r, out: Math.max(0.35, out) });
  }
  // scallops around every mass give the cumulus silhouette of an old oak
  const satellites: Lobe[] = [];
  for (const l of lobes) {
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      const s = { x: l.x + Math.cos(a) * l.r * 0.85, y: l.y + Math.sin(a) * l.r * 0.85, r: l.r * (0.32 + rnd() * 0.2), out: l.out };
      if (!bare(s, s.r)) satellites.push(s);
    }
  }
  return [...lobes, ...satellites];
}

/** The crown as one shape: its outline at each angle around a centre, and a test for what lies inside. */
interface Crown {
  path: string;
  contains: (p: Point) => boolean;
  /** Area inside the outline. */
  area: number;
}

const RAYS = 240;

/**
 * One continuous crown around all the leaf masses: seen from the crown's centre, its edge at each angle
 * is the furthest edge of any mass in that direction, smoothed and gently scalloped like a real
 * canopy. Where no mass lies (straight down, along the bare trunk) the edge arches up toward the
 * centre, so the trunk below the crown stays clear.
 */
function crownOf(lobes: Lobe[], axis: number, rnd: () => number, people: Point[] = []): Crown {
  const weight = lobes.reduce((s, l) => s + l.r * l.r, 0) || 1;
  const centre = { x: axis, y: lobes.reduce((s, l) => s + l.y * l.r * l.r, 0) / weight };
  const extent = Math.max(...lobes.map((l) => Math.hypot(l.x - centre.x, l.y - centre.y) + l.r));
  const raw = Array.from({ length: RAYS }, (_, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const [cx, cy] = [Math.cos(a), Math.sin(a)];
    let far = extent * 0.12;
    for (const l of lobes) {
      const dx = l.x - centre.x;
      const dy = l.y - centre.y;
      const t = dx * cx + dy * cy;
      const off = Math.abs(-dx * cy + dy * cx);
      if (off < l.r && t > 0) far = Math.max(far, t + Math.sqrt(l.r * l.r - off * off));
    }
    return far;
  });
  // smooth over neighbouring rays (closing small gaps between masses), then scallop the rim a little
  const smooth = (r: number[], k: number) =>
    r.map((_, i) => {
      let sum = 0;
      for (let j = -k; j <= k; j++) sum += r[(i + j + RAYS) % RAYS];
      return sum / (2 * k + 1);
    });
  // Over the top and sides the crown rounds out toward the masses' convex hull, filling the notches
  // between limbs into one dome; underneath it keeps its arch, so the trunk below stays bare.
  // every portrait is taken in, with room around it, so even the families nearest the ground sit
  // inside the canopy
  const around = people.flatMap((c) => [-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({ x: c.x + sx * 130, y: c.y + (sy < 0 ? -150 : 190) }))));
  const hull = convexHull([
    ...lobes.flatMap((l) => Array.from({ length: 16 }, (_, k) => ({ x: l.x + l.r * Math.cos((k / 16) * Math.PI * 2), y: l.y + l.r * Math.sin((k / 16) * Math.PI * 2) }))),
    ...around,
  ]);
  const domed = raw.map((r, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const toHull = rayToPolygon(centre, a, hull) ?? r;
    // all the way round, so the canopy takes in every limb, the low ones near the ground too
    return Math.max(r, r + (toHull - r) * 0.92);
  });
  const scallop = Array.from({ length: 24 }, () => rnd());
  // the underside is smoothed far more, into one clean arch over the trunk instead of hanging tongues
  const fine = smooth(smooth(domed, 6), 4);
  const broad = smooth(smooth(domed, 18), 12);
  // ...reaching below the lowest leaves at the sides, but arching up a little over the trunk, so the
  // trunk's foot still stands clear beneath the canopy
  const halfWidth = Math.max(...lobes.map((l) => Math.abs(l.x - axis) + l.r));
  const depth = Math.max(...lobes.map((l) => l.y + l.r), ...around.map((p) => p.y)) - centre.y + 30;
  const archAt = (dx: number) => depth * (0.97 + 0.12 * Math.pow(Math.min(1, Math.abs(dx) / halfWidth), 1.3));
  const radius = fine.map((r, i) => {
    const a = (i / RAYS) * Math.PI * 2;
    const down = Math.max(0, Math.sin(a));
    let shaped = Math.max(r, r + (broad[i] - r) * down);
    if (down > 0) {
      let lo = 0;
      let hi = shaped;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (mid * Math.sin(a) <= archAt(mid * Math.cos(a))) lo = mid;
        else hi = mid;
      }
      shaped = lo;
    }
    return shaped * (1 + 0.02 * Math.sin(a * 24 + scallop[i % 24] * 6));
  });

  const at = (i: number): Point => {
    const a = (i / RAYS) * Math.PI * 2;
    return { x: centre.x + Math.cos(a) * radius[i % RAYS], y: centre.y + Math.sin(a) * radius[i % RAYS] };
  };
  // a closed Catmull-Rom curve through every eighth ray point
  const step = 3;
  const pts = Array.from({ length: RAYS / step }, (_, k) => at(k * step));
  const n = pts.length;
  let path = `M${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    path += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  path += 'Z';

  const contains = (p: Point) => {
    const a = Math.atan2(p.y - centre.y, p.x - centre.x);
    const f = (((a / (Math.PI * 2)) * RAYS) % RAYS + RAYS) % RAYS;
    const i = Math.floor(f);
    const r = radius[i] + (radius[(i + 1) % RAYS] - radius[i]) * (f - i);
    return Math.hypot(p.x - centre.x, p.y - centre.y) < r;
  };
  const ring = Array.from({ length: RAYS }, (_, i) => at(i));
  const area = Math.abs(ring.reduce((s, p, i) => s + p.x * ring[(i + 1) % RAYS].y - ring[(i + 1) % RAYS].x * p.y, 0)) / 2;
  return { path, contains, area };
}

/** Convex hull of points (monotone chain), counter-clockwise. */
function convexHull(points: Point[]): Point[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Point[] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Distance from `from` along angle `a` to where the ray leaves a convex polygon, if it does. */
function rayToPolygon(from: Point, a: number, poly: Point[]): number | null {
  const d = { x: Math.cos(a), y: Math.sin(a) };
  let best: number | null = null;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const e = { x: q.x - p.x, y: q.y - p.y };
    const den = d.x * e.y - d.y * e.x;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((p.x - from.x) * e.y - (p.y - from.y) * e.x) / den;
    const u = ((p.x - from.x) * d.y - (p.y - from.y) * d.x) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best ?? 0, t);
  }
  return best;
}

/**
 * Engraved canopy: leaves gathered at the outer twig tips and sparse toward the trunk, varied in size,
 * angle and tone; outlined where lit, filled and hatched in shadow, a few in a lighter tone; over a
 * soft canopy silhouette.
 */
export function generateFoliage(layout: TreeLayout, opts: FoliageOptions): Foliage {
  const empty: Foliage = { lit: '', shade: '', light: '', hatch: '', canopy: '', leafCount: 0, contains: () => false };
  if (!layout.members.length) {
    return empty;
  }
  const rnd = seededRandom(opts.seed);
  const lobes = canopyLobes(layout, rnd, opts.extraTips);
  if (!lobes.length) {
    return empty;
  }
  const maxLeaves = opts.maxLeaves ?? 14000;

  const axis = layout.trunk.base.x;
  const people = layout.members.filter((m) => m.center.y < layout.trunk.base.y).map((m) => m.center);
  const crown = crownOf(lobes, axis, rnd, people);
  const crownBox = crown.path.match(/-?[\d.]+ -?[\d.]+/g)!.map((xy) => xy.split(' ').map(Number));
  const reach = Math.max(1, ...lobes.map((l) => Math.abs(l.x - axis) + l.r));
  // the trunk below the crown stays bare wood
  const bareTrunk = (p: Point) => p.y > layout.trunk.top.y && Math.abs(p.x - axis) < 130;
  const minX = Math.min(...lobes.map((l) => l.x - l.r), ...crownBox.map(([x]) => x));
  const maxX = Math.max(...lobes.map((l) => l.x + l.r), ...crownBox.map(([x]) => x));
  const minY = Math.min(...lobes.map((l) => l.y - l.r), ...crownBox.map(([, y]) => y));
  const maxY = Math.max(...lobes.map((l) => l.y + l.r), ...crownBox.map(([, y]) => y));
  // spacing from the crown's own area at its average leaf density, so a big, spread-out tree is as
  // leafy where it has leaves as a small one, and the budget reaches the whole crown
  const area = crown.area * 0.42;
  const spacing = Math.max(MIN_SPACING, Math.sqrt(area / maxLeaves));
  const leafScale = spacing / MIN_SPACING;
  const height = Math.max(1, maxY - minY);

  let lit = '';
  let shade = '';
  let light = '';
  let hatch = '';
  let count = 0;

  for (let y = minY; y < maxY && count < maxLeaves; y += spacing) {
    for (let x = minX; x < maxX; x += spacing) {
      const p = { x: x + rnd() * spacing, y: y + rnd() * spacing };
      // the lobe this point belongs to most strongly (deepest inside)
      let best: Lobe | null = null;
      let bestDepth = 0;
      for (const l of lobes) {
        const d = Math.hypot(p.x - l.x, p.y - l.y) / l.r;
        if (d < 1 && (best === null || 1 - d > bestDepth)) {
          best = l;
          bestDepth = 1 - d;
        }
      }
      // between the masses, the merged crown still carries leaves, more thinly, shaded by the nearest mass
      let between = false;
      if (!best) {
        if (bareTrunk(p) || !crown.contains(p)) {
          continue;
        }
        best = lobes.reduce((a, l) => (Math.hypot(p.x - l.x, p.y - l.y) - l.r < Math.hypot(p.x - a.x, p.y - a.y) - a.r ? l : a));
        between = true;
      }
      // dense out at the tips, sparse toward the trunk; thinning to a ragged edge at each mass's rim
      const out = Math.min(1, Math.abs(p.x - axis) / reach);
      const density = between
        ? (INNER_DENSITY + (1 - INNER_DENSITY) * out) * 0.45
        : (INNER_DENSITY + (1 - INNER_DENSITY) * best.out) * Math.min(1, 0.35 + bestDepth * 2.2);
      if (rnd() > density || opts.clearings.some((c) => insideClearing(p, c))) {
        continue;
      }
      if (count >= maxLeaves) {
        break;
      }
      const dx = p.x - best.x;
      const dy = p.y - best.y;
      const dist = Math.hypot(dx, dy) || 1;
      const facing = ((dx / dist) * LIGHT.x + (dy / dist) * LIGHT.y) * Math.pow(Math.min(1, dist / best.r), 0.6);
      const depth = (p.y - minY) / height; // lower in the crown = deeper shadow
      const tone = facing - depth * 0.4 + (rnd() - 0.5) * 0.45;

      if (tone > 0.38 && rnd() < 0.35) {
        continue; // sparkle: bare paper on the brightest surfaces
      }
      // leaves point outward from their mass, each at its own angle and size
      const angle = Math.atan2(dy, dx) + (rnd() - 0.5) * 2.2;
      const size = leafScale * (0.65 + Math.pow(rnd(), 1.6) * 1.05);
      const len = LEAF_LENGTH * size;
      const wid = LEAF_WIDTH * size * (0.8 + rnd() * 0.4);
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const a = { x: p.x, y: p.y };
      const b = { x: p.x + ux * len, y: p.y + uy * len };
      const m = { x: p.x + ux * len * 0.5, y: p.y + uy * len * 0.5 };
      const c1 = { x: m.x - uy * wid, y: m.y + ux * wid };
      const c2 = { x: m.x + uy * wid, y: m.y - ux * wid };
      const leaf = `M${pt(a)}Q${pt(c1)} ${pt(b)}Q${pt(c2)} ${pt(a)}Z`;
      count++;

      if (tone < -0.3) {
        shade += leaf;
        if (rnd() < 0.6) {
          const hx = p.x + (rnd() - 0.5) * spacing;
          const hy = p.y + spacing * 0.6;
          hatch += `M${fmt(hx)} ${fmt(hy)}l${fmt(spacing * 0.9)} ${fmt(-spacing * 0.35)}`;
        }
      } else if (tone > 0.15 && rnd() < 0.3) {
        light += leaf;
      } else {
        lit += leaf;
      }
    }
  }
  return { lit, shade, light, hatch, canopy: crown.path, leafCount: count, contains: crown.contains };
}
