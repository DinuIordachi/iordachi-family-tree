import { seededRandom } from './seeded-random';
import { fmt, pt } from './sketch';
import { Point, TreeLayout } from './types';

/** An area kept free of leaves so a medallion, banner or ornament stays legible. */
export type Clearing =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number };

export interface FoliageOptions {
  seed: number;
  clearings: Clearing[];
  /** Upper bound on engraved leaves; spacing grows on large trees to respect it. */
  maxLeaves?: number;
}

export interface Foliage {
  /** Outlined leaves on lit and half-lit surfaces (stroke only). */
  lit: string;
  /** Filled leaves in the shadowed parts of each leaf mass. */
  shade: string;
  /** Short dark engraving strokes between shadowed leaves. */
  hatch: string;
  leafCount: number;
}

interface Lobe {
  x: number;
  y: number;
  r: number;
}

/** Light falls from the upper left, as in the reference engravings. */
const LIGHT = { x: -0.55, y: -0.83 };
const LEAF_LENGTH = 6.6;
const LEAF_WIDTH = 2.3;
const MIN_SPACING = 6.2;

function insideClearing(p: Point, c: Clearing): boolean {
  if (c.kind === 'ellipse') {
    return ((p.x - c.cx) / c.rx) ** 2 + ((p.y - c.cy) / c.ry) ** 2 <= 1;
  }
  return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h;
}

/** Leaf masses: one per person, more along branches and over the crown, ringed with smaller scallops. */
function canopyLobes(layout: TreeLayout, rnd: () => number): Lobe[] {
  const lobes: Lobe[] = [];
  const topY = Math.min(...layout.members.map((m) => m.center.y));
  for (const m of layout.members) {
    lobes.push({ x: m.center.x, y: m.center.y - 25, r: 108 + rnd() * 26 });
    if (m.center.y === topY) {
      lobes.push({ x: m.center.x + (rnd() - 0.5) * 60, y: m.center.y - 110, r: 92 + rnd() * 22 });
    }
  }
  for (const b of layout.branches) {
    lobes.push({ x: (b.from.x + b.to.x) / 2, y: (b.from.y + b.to.y) / 2, r: 78 + rnd() * 20 });
  }
  // rows: extend each generation a little beyond its outermost people
  const rows = new Map<number, number[]>();
  for (const m of layout.members) {
    rows.set(m.center.y, [...(rows.get(m.center.y) ?? []), m.center.x]);
  }
  for (const [y, xs] of rows) {
    lobes.push({ x: Math.min(...xs) - 70, y: y - 20, r: 80 + rnd() * 20 });
    lobes.push({ x: Math.max(...xs) + 70, y: y - 20, r: 80 + rnd() * 20 });
  }
  // scallops around every mass give the cumulus silhouette of an old oak
  const satellites: Lobe[] = [];
  for (const l of lobes) {
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      satellites.push({ x: l.x + Math.cos(a) * l.r * 0.82, y: l.y + Math.sin(a) * l.r * 0.82, r: l.r * (0.32 + rnd() * 0.16) });
    }
  }
  return [...lobes, ...satellites];
}

/**
 * Engraved oak canopy: thousands of small leaves scattered over scalloped leaf masses,
 * shaded by each mass's orientation to the light — outlined where lit, filled and hatched in shadow.
 */
export function generateFoliage(layout: TreeLayout, opts: FoliageOptions): Foliage {
  const empty: Foliage = { lit: '', shade: '', hatch: '', leafCount: 0 };
  if (!layout.members.length) {
    return empty;
  }
  const rnd = seededRandom(opts.seed);
  const lobes = canopyLobes(layout, rnd);
  const maxLeaves = opts.maxLeaves ?? 9000;

  const minX = Math.min(...lobes.map((l) => l.x - l.r));
  const maxX = Math.max(...lobes.map((l) => l.x + l.r));
  const minY = Math.min(...lobes.map((l) => l.y - l.r));
  // keep the trunk visible: the canopy's underside ends a little below the founders, with a ragged edge
  const floorY = layout.trunk.top.y + 40;
  const maxY = Math.min(floorY, Math.max(...lobes.map((l) => l.y + l.r)));
  const area = (maxX - minX) * (maxY - minY) * 0.72;
  const spacing = Math.max(MIN_SPACING, Math.sqrt(area / maxLeaves));
  const leafScale = spacing / MIN_SPACING;
  const height = Math.max(1, maxY - minY);

  let lit = '';
  let shade = '';
  let hatch = '';
  let count = 0;

  for (let y = minY; y < maxY; y += spacing) {
    for (let x = minX; x < maxX; x += spacing) {
      const p = { x: x + rnd() * spacing, y: y + rnd() * spacing };
      const ragged = floorY - 18 + rnd() * 26;
      if (p.y > ragged) {
        continue;
      }
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
      if (!best || opts.clearings.some((c) => insideClearing(p, c))) {
        continue;
      }
      if (count >= maxLeaves) {
        break;
      }
      const dx = p.x - best.x;
      const dy = p.y - best.y;
      const dist = Math.hypot(dx, dy) || 1;
      const facing = ((dx / dist) * LIGHT.x + (dy / dist) * LIGHT.y) * Math.pow(dist / best.r, 0.6);
      const depth = (p.y - minY) / height; // lower in the crown = deeper shadow
      const tone = facing - depth * 0.45 + (rnd() - 0.5) * 0.35;

      if (tone > 0.32 && rnd() < 0.45) {
        continue; // sparkle: bare paper on the brightest surfaces
      }
      const angle = rnd() * Math.PI * 2;
      const len = LEAF_LENGTH * leafScale * (0.8 + rnd() * 0.45);
      const wid = LEAF_WIDTH * leafScale * (0.8 + rnd() * 0.4);
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const a = { x: p.x, y: p.y };
      const b = { x: p.x + ux * len, y: p.y + uy * len };
      const m = { x: p.x + ux * len * 0.5, y: p.y + uy * len * 0.5 };
      const c1 = { x: m.x - uy * wid, y: m.y + ux * wid };
      const c2 = { x: m.x + uy * wid, y: m.y - ux * wid };
      const leaf = `M${pt(a)}Q${pt(c1)} ${pt(b)}Q${pt(c2)} ${pt(a)}Z`;
      count++;

      if (tone < -0.28) {
        shade += leaf;
        if (rnd() < 0.7) {
          const hx = p.x + (rnd() - 0.5) * spacing;
          const hy = p.y + spacing * 0.6;
          hatch += `M${fmt(hx)} ${fmt(hy)}l${fmt(spacing * 0.9)} ${fmt(-spacing * 0.35)}`;
        }
      } else {
        lit += leaf;
      }
    }
  }
  return { lit, shade, hatch, leafCount: count };
}
