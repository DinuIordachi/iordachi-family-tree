/** Small 2D helpers shared by the layout and the decorations. */

export type Pt = [number, number];
export type Seg = [Pt, Pt];

/** Absolute points of an M/L/H/V path, as produced by layoutLife. */
export function pathPoints(d: string): Pt[] {
  const pts: Pt[] = [];
  for (const [, cmd, a, b] of d.matchAll(/([MLHV])(-?[\d.]+)(?: (-?[\d.]+))?/g)) {
    const last = pts[pts.length - 1];
    if (cmd === 'H') pts.push([+a, last[1]]);
    else if (cmd === 'V') pts.push([last[0], +a]);
    else pts.push([+a, +b]);
  }
  return pts;
}

/** The straight segments of an M/L/H/V path. */
export function pathSegs(d: string): Seg[] {
  const out: Seg[] = [];
  for (const sub of d.split('M').filter(Boolean)) {
    const pts = pathPoints('M' + sub);
    for (let i = 1; i < pts.length; i++) out.push([pts[i - 1], pts[i]]);
  }
  return out;
}

export function distToSeg([px, py]: Pt, [[ax, ay], [bx, by]]: Seg): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Points every `step` units along a polyline, ends included. */
export function samplePolyline(line: Pt[], step = 8): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j <= n; j++) out.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  return out;
}

export const polyD = (line: Pt[]): string => 'M' + line.map((p) => `${p[0]} ${p[1]}`).join(' L');
