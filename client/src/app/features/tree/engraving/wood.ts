import { branchWidths } from './branch-geometry';
import { hashSeed, seededRandom } from './seeded-random';
import { dashes, fmt, noise1D, normals, offsetLine, polyline, pt, ribbonOutline, sampleCubic } from './sketch';
import { BranchSegment, Point, TreeLayout } from './types';

/** An engraved piece of wood: paper-filled body, longitudinal bark grooves and shade-side hatching. */
export interface EngravedWood {
  body: string;
  grooves: string;
  shading: string;
}

export interface EngravedTrunk extends EngravedWood {
  knots: string;
}

export interface EngravedBranch extends EngravedWood {
  twigs: string;
}

export interface RootSystem {
  /** Paper-filled outlines of the thicker roots. */
  bodies: string;
  /** Bark lines along the thicker roots. */
  grooves: string;
  /** Hair roots drawn as single engraved strokes. */
  fine: string;
}

export interface SoilOptions {
  spreadX: number;
  depth: number;
}

/** Light from the upper left: the right-hand side (+frac) of wood is the shadow side. */
function barkGrooves(centre: Point[], half: number[], rnd: () => number, lines: number): string {
  let out = '';
  for (let k = 0; k < lines; k++) {
    const base = -0.85 + (1.7 * (k + 0.5)) / lines;
    const wave = noise1D(rnd, 10);
    const line = offsetLine(centre, half, (i) => Math.max(-0.95, Math.min(0.95, base + wave(i / centre.length) * 0.12)));
    const keep = base < 0 ? 0.5 : 0.92;
    out += dashes(line, rnd, () => keep, 3, 10);
  }
  return out;
}

/** Short strokes across the shadow side, crossed again where the shadow is deepest. */
function sideShading(centre: Point[], half: number[], rnd: () => number, every = 2): string {
  const n = normals(centre);
  let out = '';
  for (let i = 0; i < centre.length; i += every) {
    const p = centre[i];
    const h = half[i];
    if (h < 1.2) {
      continue;
    }
    const from = 0.32 + rnd() * 0.15;
    const a = { x: p.x - n[i].x * h * from, y: p.y - n[i].y * h * from };
    const b = { x: p.x - n[i].x * h * 0.97, y: p.y - n[i].y * h * 0.97 };
    out += `M${pt(a)}L${pt({ x: b.x, y: b.y + h * 0.18 })}`;
    if (i % (every * 2) === 0 && h > 4) {
      const c = { x: p.x - n[i].x * h * 0.62, y: p.y - n[i].y * h * 0.62 + h * 0.25 };
      out += `M${pt(c)}L${pt({ x: b.x, y: b.y - h * 0.2 })}`;
    }
  }
  return out;
}

function ellipseArc(cx: number, cy: number, rx: number, ry: number): string {
  return `M${fmt(cx - rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx + rx)} ${fmt(cy)}A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx - rx)} ${fmt(cy)}`;
}

/** Gnarled trunk: flared buttresses at the ground, wavering contour, bark grooves, knots and shading. */
export function engravedTrunk(trunk: TreeLayout['trunk'], seed: number, baseWidth = 92): EngravedTrunk {
  const rnd = seededRandom(seed);
  const { base, top } = trunk;
  const samples = 44;
  const sway = noise1D(rnd, 6);
  const bumps = noise1D(rnd, 18);
  const topHalf = branchWidths(0).start / 2;
  const baseHalf = baseWidth / 2;
  const centre: Point[] = [];
  const half: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    centre.push({ x: base.x + (top.x - base.x) * t + sway(t) * 7 * Math.sin(Math.PI * t), y: base.y + (top.y - base.y) * t });
    const taper = topHalf + (baseHalf * 0.62 - topHalf) * Math.pow(1 - t, 1.6);
    const flare = baseHalf * 0.38 * Math.pow(1 - t, 7);
    half.push(Math.max(topHalf, taper + flare + bumps(t) * 2.2 * (1 - t)));
  }
  half[samples] = topHalf;

  let knots = '';
  for (let k = 0; k < 3; k++) {
    const i = Math.round(samples * (0.22 + 0.2 * k + rnd() * 0.1));
    const side = k % 2 === 0 ? -0.42 : 0.38;
    const [p] = offsetLine([centre[i]], [half[i]], side).length ? [offsetLine(centre, half, side)[i]] : [centre[i]];
    const rx = 3.5 + rnd() * 2.5;
    const ry = rx * (1.5 + rnd() * 0.5);
    knots += ellipseArc(p.x, p.y, rx, ry) + ellipseArc(p.x, p.y, rx * 0.55, ry * 0.55);
  }

  return {
    body: ribbonOutline(centre, half),
    grooves: barkGrooves(centre, half, rnd, 11),
    shading: sideShading(centre, half, rnd, 1),
    knots,
  };
}

/** Organic branch along the genealogical link, with bark and a few twigs reaching into the foliage. */
export function engravedBranch(seg: BranchSegment, endWidth?: number): EngravedBranch {
  const rnd = seededRandom(hashSeed(seg.id));
  const j = () => (rnd() * 2 - 1) * 12;
  const dx = seg.to.x - seg.from.x;
  const dy = seg.to.y - seg.from.y;
  const c1 = { x: seg.from.x + j(), y: seg.from.y + 0.4 * dy + j() };
  const c2 = { x: seg.to.x + j(), y: seg.to.y - 0.3 * dy + j() };
  const samples = 24;
  const raw = sampleCubic(seg.from, c1, c2, seg.to, samples);
  const n = normals(raw);
  const wobble = noise1D(rnd, 8);
  const centre = raw.map((p, i) => {
    const t = i / samples;
    const w = wobble(t) * 3 * Math.sin(Math.PI * t);
    return { x: p.x + n[i].x * w, y: p.y + n[i].y * w };
  });
  const { start, end } = branchWidths(seg.generation);
  const tip = endWidth ?? end;
  const half = centre.map((_, i) => (start + (tip - start) * (i / samples)) / 2);

  let twigs = '';
  const length = Math.hypot(dx, dy);
  const count = length < 1 ? 0 : 2 + Math.floor(length / 70);
  for (let k = 0; k < count; k++) {
    const i = Math.min(samples - 1, Math.round(samples * (0.35 + rnd() * 0.55)));
    const p = centre[i];
    const tangent = Math.atan2(centre[i + 1].y - p.y, centre[i + 1].x - p.x);
    const side = rnd() < 0.5 ? -1 : 1;
    const angle = tangent + side * (0.55 + rnd() * 0.6);
    const len = 26 + rnd() * 38;
    const w0 = Math.max(1.4, half[i] * 0.55);
    twigs += twig(p, angle, len, w0, rnd, 2);
  }

  return {
    body: ribbonOutline(centre, half),
    grooves: barkGrooves(centre, half, rnd, Math.max(2, Math.min(6, Math.round(start / 5)))),
    shading: sideShading(centre, half, rnd, 1),
    twigs,
  };
}

/** A tapered twig (filled), forking once or twice. */
function twig(from: Point, angle: number, len: number, w0: number, rnd: () => number, depth: number): string {
  const steps = 8;
  const bend = (rnd() - 0.5) * 0.6;
  const pts: Point[] = [];
  const half: number[] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const a = angle + bend * t;
    const prev = pts[s - 1] ?? from;
    pts.push(s === 0 ? from : { x: prev.x + Math.cos(a) * (len / steps), y: prev.y + Math.sin(a) * (len / steps) });
    half.push(Math.max(0.25, (w0 / 2) * (1 - t * 0.85)));
  }
  let out = ribbonOutline(pts, half);
  if (depth > 0) {
    const at = pts[Math.round(steps * (0.45 + rnd() * 0.3))];
    out += twig(at, angle + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5), len * 0.5, w0 * 0.55, rnd, depth - 1);
  }
  return out;
}

/** Branching root system spreading through a semi-elliptical soil cutaway below the trunk. */
export function rootSystem(base: Point, opts: SoilOptions, seed: number): RootSystem {
  const rnd = seededRandom(seed);
  const out: RootSystem = { bodies: '', grooves: '', fine: '' };
  const inside = (p: Point) => ((p.x - base.x) / opts.spreadX) ** 2 + (Math.max(0, p.y - base.y) / opts.depth) ** 2 <= 1;

  const grow = (start: Point, angle: number, width: number, length: number, depth: number) => {
    const step = 5;
    const pts: Point[] = [start];
    const half: number[] = [width / 2];
    let a = angle;
    let w = width;
    const decay = width / (length / step);
    const children: Array<[Point, number, number, number]> = [];
    while (w > 0.6 && pts.length * step < length) {
      a += (rnd() - 0.5) * 0.28 + 0.02 * Math.cos(a); // wander, with a slight pull downward
      const prev = pts[pts.length - 1];
      const next = { x: prev.x + Math.cos(a) * step, y: prev.y + Math.sin(a) * step };
      if (!inside(next) || next.y < base.y - 6) {
        break;
      }
      pts.push(next);
      w -= decay * (0.8 + rnd() * 0.4);
      half.push(Math.max(0.3, w / 2));
      if (depth > 0 && w > 1.5 && rnd() < 0.11) {
        children.push([next, a + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.6), w * (0.5 + rnd() * 0.2), length * (0.45 + rnd() * 0.25)]);
      }
    }
    if (pts.length < 2) {
      return;
    }
    const thickUntil = half.findIndex((h) => h < 1.1);
    const cut = thickUntil === -1 ? pts.length : Math.max(2, thickUntil + 1);
    if (cut >= 2 && half[0] >= 1.1) {
      const c = pts.slice(0, cut);
      const h = half.slice(0, cut);
      out.bodies += ribbonOutline(c, h);
      if (h[0] > 3) {
        out.grooves += barkGrooves(c, h, rnd, Math.min(4, Math.round(h[0] / 2.5)));
      }
    }
    out.fine += polyline(pts.slice(Math.max(0, cut - 1)));
    for (const [p, ca, cw, cl] of children) {
      grow(p, ca, cw, cl, depth - 1);
    }
  };

  // two surface roots creeping along the ground, then deeper roots fanning downward
  const mains: Array<[number, number, number]> = [
    [Math.PI + 0.12, 15, opts.spreadX * 0.95],
    [-0.12, 15, opts.spreadX * 0.95],
  ];
  const deep = 6;
  for (let k = 0; k < deep; k++) {
    const t = k / (deep - 1);
    const a = Math.PI * (0.88 - 0.76 * t) + (rnd() - 0.5) * 0.15;
    mains.push([a, 20 - Math.abs(t - 0.5) * 12, opts.depth * (0.75 + rnd() * 0.3)]);
  }
  mains.forEach(([a, w, len], k) => {
    const sx = base.x + (k < 2 ? (k === 0 ? -30 : 30) : (k - 2 - (deep - 1) / 2) * 11);
    grow({ x: sx, y: base.y + 2 }, a, w, len, 3);
  });
  return out;
}

/** Horizontal engraved soil lines filling the semi-elliptical cutaway, fading toward its edge. */
export function soilHatching(base: Point, opts: SoilOptions, seed: number): string {
  const rnd = seededRandom(seed);
  let out = '';
  for (let y = base.y + 6; y < base.y + opts.depth; y += 4.2) {
    const v = (y - base.y) / opts.depth;
    const halfW = opts.spreadX * Math.sqrt(Math.max(0, 1 - v * v));
    const line: Point[] = [];
    for (let x = base.x - halfW; x <= base.x + halfW; x += 3) {
      line.push({ x, y: y + Math.sin(x * 0.05 + y) * 0.6 });
    }
    out += dashes(line, rnd, (t) => 0.95 - Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.75 - v * 0.35, 4, 16);
  }
  return out;
}
