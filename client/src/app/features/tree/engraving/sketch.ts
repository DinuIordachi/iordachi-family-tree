import { Point } from './types';

/** Shared low-level drawing helpers for the engraving generators. */

export const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
export const pt = (p: Point) => `${fmt(p.x)} ${fmt(p.y)}`;

/** Open polyline as a path sub-command string. */
export function polyline(points: Point[]): string {
  if (points.length < 2) {
    return '';
  }
  return `M${pt(points[0])}` + points.slice(1).map((p) => `L${pt(p)}`).join('');
}

export function cubicPoint(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

export function sampleCubic(p0: Point, c1: Point, c2: Point, p3: Point, samples: number): Point[] {
  return Array.from({ length: samples + 1 }, (_, i) => cubicPoint(p0, c1, c2, p3, i / samples));
}

/** Unit left-normals along a polyline (falls back to pointing left of "up" for degenerate spans). */
export function normals(points: Point[]): Point[] {
  return points.map((_, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
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
    return { x: -ty, y: tx };
  });
}

/** Points offset across a ribbon: `frac` -1 = left edge, 0 = centre, 1 = right edge. */
export function offsetLine(centre: Point[], half: number[], frac: number | ((i: number) => number)): Point[] {
  const n = normals(centre);
  return centre.map((p, i) => {
    const f = typeof frac === 'number' ? frac : frac(i);
    return { x: p.x - n[i].x * half[i] * f, y: p.y - n[i].y * half[i] * f };
  });
}

/** Closed outline of a ribbon of varying half-width, with a rounded far end. */
export function ribbonOutline(centre: Point[], half: number[]): string {
  if (centre.length < 2) {
    return '';
  }
  const left = offsetLine(centre, half, -1);
  const right = offsetLine(centre, half, 1);
  const last = centre.length - 1;
  const tip = Math.max(0.3, half[last]);
  return (
    `M${pt(left[0])}` +
    left.slice(1).map((p) => `L${pt(p)}`).join('') +
    // sweep 0: the cap bulges outward past the end (sweep 1 would notch a half-disc into it)
    `A${fmt(tip)} ${fmt(tip)} 0 0 0 ${pt(right[last])}` +
    right
      .slice(0, last)
      .reverse()
      .map((p) => `L${pt(p)}`)
      .join('') +
    'Z'
  );
}

/** Smooth 1-D value noise in [-1, 1], seeded through the given RNG. */
export function noise1D(rnd: () => number, lattice = 16): (t: number) => number {
  const values = Array.from({ length: lattice + 2 }, () => rnd() * 2 - 1);
  return (t: number) => {
    const x = Math.max(0, Math.min(1, t)) * lattice;
    const i = Math.floor(x);
    const f = x - i;
    const s = (1 - Math.cos(f * Math.PI)) / 2;
    return values[i] * (1 - s) + values[i + 1] * s;
  };
}

/** Break a polyline into dashes; `keep(t)` gives the chance each dash survives at position t∈[0,1]. */
export function dashes(points: Point[], rnd: () => number, keep: (t: number, i: number) => number, minLen = 3, maxLen = 9): string {
  let out = '';
  let i = 0;
  while (i < points.length - 1) {
    const len = minLen + Math.floor(rnd() * (maxLen - minLen + 1));
    const j = Math.min(points.length - 1, i + len);
    if (rnd() < keep(i / Math.max(1, points.length - 1), i)) {
      out += polyline(points.slice(i, j + 1));
    }
    i = j + 1 + Math.floor(rnd() * 2);
  }
  return out;
}
