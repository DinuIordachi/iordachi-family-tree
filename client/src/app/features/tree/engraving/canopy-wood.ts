import { seededRandom } from './seeded-random';
import { normals, pt, ribbonOutline, sampleCubic } from './sketch';
import { Point } from './types';

/**
 * The lesser wood of the crown: branches grown recursively out of the main limbs, forking into ever
 * thinner, gently curved branches until they end in fine twigs at the canopy's edge — the way a
 * tree-of-life silhouette fills its crown. Every piece is a closed, tapered shape; a child is never
 * thicker than its parent where it leaves it, and the widths at a fork follow Leonardo's rule
 * (w_parent² ≈ Σ w_child²).
 */

/** A main limb the crown grows out of: its centreline and half-widths, sampled together. */
export interface LimbWood {
  centre: Point[];
  half: number[];
}

export interface CrownWood {
  /** Filled wood of the thicker crown branches (inked and paper-filled like the limbs). */
  body: string;
  /** Fine twigs, too thin to outline. */
  twigs: string;
  /** Joint webs where crown branches leave the limbs. */
  webs: string;
}

export interface CrownWoodOptions {
  seed: number;
  /** Where wood may grow: inside the crown, outside every portrait, banner and ornament. */
  allowed: (p: Point) => boolean;
  /** One branch per this much limb length, roughly. */
  spacing?: number;
  /** Recursion depth below the branch that leaves the limb. */
  depth?: number;
}

const UP: Point = { x: 0, y: -1 };
/** Pixel size of the occupancy grid that keeps branches from crossing and spreads them evenly. */
const CELL = 8;
/** Below this width a branch is drawn as a twig (no ink outline). */
const TWIG_WIDTH = 2.4;

const unit = (p: Point): Point => {
  const l = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / l, y: p.y / l };
};
const rotate = (v: Point, a: number): Point => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });

/** Arc lengths along a polyline. */
function arcLengths(line: Point[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  return out;
}

/**
 * The curved web where a branch leaves wood running along `parentDir`: the branch's two edges sweep
 * out along the parent in concave curves, so the joint reads as one piece of wood, not a stick pushed
 * into a pole. The web's base lies on the parent's own centreline, inside its wood.
 */
export function jointWeb(centre: Point[], half: number[], parentDir: Point, spread = 1.5): string {
  if (centre.length < 3 || half[0] < 0.8) return '';
  const d = unit(parentDir);
  const s = arcLengths(centre);
  const reach = half[0] * 2.4;
  let k = s.findIndex((v) => v >= reach);
  k = Math.max(2, Math.min(k === -1 ? centre.length - 1 : k, Math.floor(centre.length / 2)));
  const n = normals(centre);
  const edge = (i: number, sgn: number): Point => add(centre[i], n[i], sgn * half[i]);
  // the edge on the side the parent carries on toward is the crotch; the other the outer shoulder
  const crotch = n[0].x * d.x + n[0].y * d.y > 0 ? 1 : -1;
  const b = centre[0];
  const w = half[0];
  const down = add(b, d, -w * spread * 1.3);
  const up = add(b, d, w * spread);
  const outer0 = edge(0, -crotch);
  const inner0 = edge(0, crotch);
  const outerK = edge(k, -crotch);
  const innerK = edge(k, crotch);
  const outerC = add(outer0, d, -w * 0.4);
  const innerC = add(inner0, d, w * 0.4);
  // wind the web the same way as the branch's own outline (ribbonOutline runs out along the +normal
  // edge and back along the other), so where the two overlap they add up instead of cutting a hole
  const area = (pts: Point[]) => pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0);
  const branchWinding = Math.sign(area([edge(0, 1), edge(k, 1), edge(k, -1), edge(0, -1)]));
  const webWinding = Math.sign(area([down, outerK, innerK, up]));
  return webWinding === branchWinding
    ? `M${pt(down)}Q${pt(outerC)} ${pt(outerK)}L${pt(innerK)}Q${pt(innerC)} ${pt(up)}Z`
    : `M${pt(up)}Q${pt(innerC)} ${pt(innerK)}L${pt(outerK)}Q${pt(outerC)} ${pt(down)}Z`;
}

/** Half-widths of one crown branch: from `w0` at its base down to `w1` at its end, smoothly. */
function taper(w0: number, w1: number, samples: number): number[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    return Math.max(0.3, (w1 + (w0 - w1) * Math.pow(1 - t, 1.2)) / 2);
  });
}

/** Grows the crown's lesser wood out of the main limbs. Deterministic for a given seed. */
export function growCrownWood(limbs: LimbWood[], opts: CrownWoodOptions): CrownWood {
  const rnd = seededRandom(opts.seed);
  const spacing = opts.spacing ?? 64;
  const maxDepth = opts.depth ?? 6;
  const out: CrownWood = { body: '', twigs: '', webs: '' };

  // ---- Occupancy grid: which branch holds each cell, so a new branch neither crosses nor crowds one.
  const grid = new Map<number, number>();
  const key = (x: number, y: number) => (Math.floor(y / CELL) + 50000) * 100000 + (Math.floor(x / CELL) + 50000);
  const stepAlong = (line: Point[], visit: (p: Point) => boolean | void): boolean => {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2)));
      for (let j = i === 1 ? 0 : 1; j <= n; j++) {
        if (visit({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n }) === false) return false;
      }
    }
    return true;
  };
  const mark = (line: Point[], half: number[], owner: number) => {
    const s = arcLengths(line);
    const total = s[s.length - 1] || 1;
    stepAlong(line, (p) => {
      // radius from the width near this point, plus a small gap so neighbours keep apart
      const along = Math.min(line.length - 1, Math.round((Math.hypot(p.x - line[0].x, p.y - line[0].y) / total) * (line.length - 1)));
      const r = Math.round((half[along] + 3) / CELL);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) grid.set(key(p.x + dx * CELL, p.y + dy * CELL), owner);
    });
  };
  /** Whether a line is free: allowed everywhere, and clear of other branches past its first stretch. */
  const free = (line: Point[], lineage: Set<number>): boolean => {
    const s = arcLengths(line);
    const total = s[s.length - 1] || 1;
    const start = line[0];
    return stepAlong(line, (p) => {
      if (!opts.allowed(p)) return false;
      if (Math.hypot(p.x - start.x, p.y - start.y) < Math.min(14, total * 0.25)) return true;
      const owner = grid.get(key(p.x, p.y));
      return owner === undefined || lineage.has(owner);
    });
  };

  let nextId = 0;
  limbs.forEach((l) => mark(l.centre, l.half, nextId++));
  const limbIds = limbs.map((_, i) => i);

  /** One crown branch and everything that forks from it; returns whether anything grew. */
  const grow = (from: Point, dir: Point, len: number, w0: number, depth: number, lineage: Set<number>, parentDir?: Point): boolean => {
    // set off along `dir`, bending gently toward the light and a little outward as it goes
    let shape: { line: Point[]; endDir: Point } | null = null;
    for (const [f, turn] of [[1, 0], [0.8, 0.25], [0.8, -0.25], [0.55, 0.45], [0.55, -0.45], [0.4, 0]] as const) {
      const d0 = unit(rotate(dir, turn));
      const d1 = unit(add(add(d0, UP, 0.28), { x: Math.sign(d0.x) || 1, y: 0 }, 0.06));
      const length = len * f;
      const end = add(from, unit(add(d0, d1)), length);
      const perp = { x: -d0.y, y: d0.x };
      const bow = (rnd() - 0.5) * 0.18 * length;
      const c1 = add(add(from, d0, length * 0.36), perp, bow);
      const c2 = add(add(end, d1, -length * 0.3), perp, bow * 0.5 + (rnd() - 0.5) * 0.08 * length);
      const line = sampleCubic(from, c1, c2, end, 8);
      if (free(line, lineage)) {
        shape = { line, endDir: d1 };
        break;
      }
    }
    if (!shape) return false;
    const id = nextId++;
    const { line, endDir } = shape;
    const segLength = arcLengths(line)[line.length - 1];
    // claim the space now, so the forks grown next keep clear of it
    mark(line, taper(w0, w0 * 0.75, 8), id);
    const own = new Set([...lineage, id]);

    // forks: two or three children, shorter and thinner, spread ±20–40° about the parent's heading
    let grewChildren = 0;
    let wEnd = 0;
    if (depth > 0 && w0 > 0.9) {
      const count = rnd() < 0.3 ? 3 : 2;
      const share = count === 3 ? 0.6 : 0.7;
      const spreads =
        count === 3
          ? [-(0.35 + rnd() * 0.35), (rnd() - 0.5) * 0.2, 0.35 + rnd() * 0.35]
          : [-(0.35 + rnd() * 0.35), 0.35 + rnd() * 0.35];
      // one child carries on a little more strongly (and a little longer) than the others
      const lead = Math.floor(rnd() * count);
      for (let c = 0; c < count; c++) {
        const wc = w0 * (share + (c === lead ? 0.08 : -0.02) + (rnd() - 0.5) * 0.06);
        const lc = len * (0.65 + rnd() * 0.15) * (c === lead ? 1.05 : 1);
        if (grow(line[line.length - 1], rotate(endDir, spreads[c]), lc, Math.min(wc, w0 * 0.75), depth - 1, own, endDir)) {
          grewChildren++;
          wEnd = Math.max(wEnd, Math.min(wc, w0 * 0.75));
        }
      }
      // a slender side shoot partway along, where long wood has room for one
      if (segLength > 60 && rnd() < 0.55) {
        const j = 4 + Math.floor(rnd() * 3);
        const along = unit({ x: line[j + 1].x - line[j].x, y: line[j + 1].y - line[j].y });
        const side = rnd() < 0.5 ? -1 : 1;
        const halfAt = taper(w0, Math.max(wEnd, 0.6), 8)[j];
        grow(line[j], rotate(along, side * (0.45 + rnd() * 0.25)), segLength * 0.55, halfAt * 2 * 0.6, Math.max(0, depth - 2), own, along);
      }
    }

    // the branch tapers to the width of its thickest fork, or, where nothing forks on, to a soft point
    const half = taper(w0, grewChildren ? wEnd : 0.5, 8);
    const shapeD = ribbonOutline(line, half);
    if (w0 >= TWIG_WIDTH) {
      out.body += shapeD;
      if (parentDir && w0 > 5) out.webs += jointWeb(line, half, parentDir, 1.2);
    } else {
      out.twigs += shapeD;
    }
    return true;
  };

  // ---- Out of every limb, alternating sides, spaced along its length.
  limbs.forEach((limb, k) => {
    const s = arcLengths(limb.centre);
    const total = s[s.length - 1];
    if (total < 60) return;
    let side = rnd() < 0.5 ? -1 : 1;
    for (let at = total * 0.14 + rnd() * spacing * 0.5; at < total * 0.94; at += spacing * (0.75 + rnd() * 0.5)) {
      const i = Math.max(1, Math.min(limb.centre.length - 2, s.findIndex((v) => v >= at)));
      const tangent = unit({ x: limb.centre[i + 1].x - limb.centre[i - 1].x, y: limb.centre[i + 1].y - limb.centre[i - 1].y });
      side = -side;
      let dir = unit(add(rotate(tangent, side * (0.5 + rnd() * 0.35)), UP, 0.25));
      if (dir.y > 0.15) {
        // never hanging down: try the other side, which climbs
        dir = unit(add(rotate(tangent, -side * (0.5 + rnd() * 0.35)), UP, 0.25));
        if (dir.y > 0.15) continue;
      }
      const w = Math.min(limb.half[i] * 2 * 0.55, 15);
      const n = normals(limb.centre)[i];
      // start on the limb's centreline (hidden inside its wood), toward the side it leaves from
      const from = add(limb.centre[i], n, (n.x * dir.x + n.y * dir.y > 0 ? 1 : -1) * limb.half[i] * 0.2);
      grow(from, dir, 130 + rnd() * 70, w, maxDepth - 1, new Set([limbIds[k]]), tangent);
    }
  });
  return out;
}
