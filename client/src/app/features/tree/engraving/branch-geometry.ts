import { hashSeed, seededRandom } from './seeded-random';
import { BranchSegment, Point, TreeLayout } from './types';

const SAMPLES = 24;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = (p: Point) => `${fmt(p.x)} ${fmt(p.y)}`;

export function branchWidths(generation: number): { start: number; end: number } {
  const start = Math.max(6, 28 - 4 * generation);
  return { start, end: Math.max(2, start * 0.35) };
}

function bezier(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

/**
 * Filled outline around a cubic centreline, tapering from w0 to w1, with a
 * rounded tip. Sampled as a polyline: the exact offset of a Bézier is not a
 * Bézier, and 24 samples read as smooth at every zoom level we allow.
 */
function taperedCurve(p0: Point, c1: Point, c2: Point, p3: Point, w0: number, w1: number): string {
  const centre = Array.from({ length: SAMPLES + 1 }, (_, i) => bezier(p0, c1, c2, p3, i / SAMPLES));
  const left: Point[] = [];
  const right: Point[] = [];
  centre.forEach((p, i) => {
    const a = centre[Math.max(0, i - 1)];
    const b = centre[Math.min(SAMPLES, i + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const len = Math.hypot(tx, ty);
    if (len < 1e-9) {
      tx = 0;
      ty = -1;
    } else {
      tx /= len;
      ty /= len;
    }
    const half = (w0 + (w1 - w0) * (i / SAMPLES)) / 2;
    left.push({ x: p.x - ty * half, y: p.y + tx * half });
    right.push({ x: p.x + ty * half, y: p.y - tx * half });
  });
  const tipR = w1 / 2;
  return (
    `M${pt(left[0])} ` +
    left.slice(1).map((p) => `L${pt(p)}`).join(' ') +
    ` A${fmt(tipR)} ${fmt(tipR)} 0 0 1 ${pt(right[SAMPLES])} ` +
    right.slice(0, SAMPLES).reverse().map((p) => `L${pt(p)}`).join(' ') +
    ' Z'
  );
}

/** Organic tapered branch: rises vertically from the parent, then bends toward the child. */
export function branchPath(seg: BranchSegment): string {
  const rnd = seededRandom(hashSeed(seg.id));
  const j = () => (rnd() * 2 - 1) * 12;
  const dy = seg.to.y - seg.from.y;
  const c1 = { x: seg.from.x + j(), y: seg.from.y + 0.4 * dy + j() };
  const c2 = { x: seg.to.x + j(), y: seg.to.y - 0.3 * dy + j() };
  const { start, end } = branchWidths(seg.generation);
  return taperedCurve(seg.from, c1, c2, seg.to, start, end);
}

/** Trunk with a flared base, narrowing to 36 units at the top. */
export function trunkPath(trunk: TreeLayout['trunk'], widthAtBase = 90): string {
  const { base, top } = trunk;
  const h = base.y - top.y;
  const wb = widthAtBase / 2;
  const wt = 18;
  return [
    `M${pt({ x: base.x - wb, y: base.y })}`,
    `C${pt({ x: base.x - wb * 0.45, y: base.y - h * 0.12 })} ${pt({ x: top.x - wt * 1.15, y: base.y - h * 0.55 })} ${pt({ x: top.x - wt, y: top.y })}`,
    `L${pt({ x: top.x + wt, y: top.y })}`,
    `C${pt({ x: top.x + wt * 1.15, y: base.y - h * 0.55 })} ${pt({ x: base.x + wb * 0.45, y: base.y - h * 0.12 })} ${pt({ x: base.x + wb, y: base.y })}`,
    'Z',
  ].join(' ');
}

/** 5–7 tapering roots spreading up to 140 units either side of the trunk base. */
export function rootsPath(base: Point, seed: number): string {
  const rnd = seededRandom(seed);
  const count = 5 + Math.floor(rnd() * 3);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 60 + rnd() * 80; // ≤ 140
    const depth = 18 + rnd() * 26;
    const startX = base.x + side * (8 + rnd() * 30);
    const p0 = { x: startX, y: base.y - 4 };
    const p3 = { x: base.x + side * reach, y: base.y + depth };
    const c1 = { x: startX + side * reach * 0.3, y: base.y + depth * 0.15 };
    const c2 = { x: base.x + side * reach * 0.75, y: base.y + depth * 0.6 };
    parts.push(taperedCurve(p0, c1, c2, p3, 14 - i, 1.5));
  }
  return parts.join(' ');
}
