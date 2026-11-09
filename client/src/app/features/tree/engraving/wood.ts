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

/** How much wider than the first limb the trunk is at its top. */
const TRUNK_TOP_RATIO = 1.3;
/** A limb swells by this much where it leaves its parent (the branch collar)… */
const COLLAR = 0.55;
/** …over about this fraction of its length. */
const COLLAR_LENGTH = 0.07;
/** Width at the trunk base of the root that runs down to a founder couple (the trunk base is ~92 wide). */
const TAPROOT_WIDTH = 48;
/** Roots start this far inside the trunk base, so the trunk's fill hides where they begin. */
const ROOT_TUCK = 10;
/** Higher = the limb loses its thickness sooner after the collar. */
const TAPER = 1.6;

/**
 * Half-widths along a limb: a flared collar where it leaves its parent, then a taper that loses most of
 * its thickness early (like real wood) and ends at exactly half the tip width.
 */
export function limbHalfWidths(start: number, tip: number, samples: number): number[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const body = tip + (start - tip) * Math.pow(1 - t, TAPER);
    return (body * (1 + COLLAR * Math.exp(-t / COLLAR_LENGTH) * (1 - t))) / 2;
  });
}

/** A root from the trunk base down to a founder couple: it dives, then eases sideways — never climbs. */
export function rootCentreline(seg: BranchSegment, samples = 24): Point[] {
  const dx = seg.to.x - seg.from.x;
  const dy = Math.max(0, seg.to.y - seg.from.y);
  const start = { x: seg.from.x, y: seg.from.y - ROOT_TUCK };
  return sampleCubic(
    start,
    { x: seg.from.x + dx * 0.1, y: seg.from.y + dy * 0.45 },
    { x: seg.to.x - dx * 0.25, y: seg.to.y - dy * 0.2 },
    seg.to,
    samples,
  );
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
  // as wide at the top as the main limb's collar, so the leader grows out of it without a step
  const topHalf = (branchWidths(0).start * TRUNK_TOP_RATIO) / 2;
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

/** A limb comes up into its person from at least this far below, under the name banner (which ends at +94). */
const APPROACH_BELOW = 140;
/** …and never closer than this (clear of the banner), even if the limb must dip a little to get there. */
const APPROACH_MIN = 110;

/** Longest curve handle on a limb span: long enough to arch, too short to loop. */
const MAX_HANDLE = 120;

const unit = (x: number, y: number): Point => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};

/**
 * Centreline of a branch grown like a real limb. It leaves the fork climbing (or first rises straight up out
 * of the household it grows from), sweeps out below its person's row, then turns upward and comes up into
 * the person from below, hidden behind the name banner, so it never runs across a portrait. Seeded kinks
 * along the way keep it from reading as a drafted curve.
 */
export function branchCentreline(seg: BranchSegment, samples = 24): Point[] {
  const rnd = seededRandom(hashSeed(seg.id));
  const { from, to } = seg;
  const dx = to.x - from.x;
  if (Math.hypot(dx, to.y - from.y) < 1e-6) {
    return Array.from({ length: samples + 1 }, () => ({ ...from }));
  }
  const side = Math.sign(dx) || 1;
  const up: Point = { x: 0, y: -1 };

  // waypoints: [fork, (clear of the household), below the person, person]
  const pts: Point[] = [from];
  if (seg.rise) {
    pts.push({ x: from.x, y: from.y - seg.rise });
  }
  const last = pts[pts.length - 1];
  const belowY = Math.max(to.y + APPROACH_MIN, Math.min(to.y + APPROACH_BELOW, last.y - 20));
  const below = { x: to.x - side * Math.min(14, Math.abs(dx) * 0.2), y: belowY };
  pts.push(below, to);

  // headings: climbing out of the fork, sweeping outward-and-up below the person, straight up into them
  const toBelow = unit(below.x - last.x, below.y - last.y);
  const tangents: Point[] = [seg.rise ? up : unit(toBelow.x * 0.6, toBelow.y * 0.6 - 0.8)];
  if (seg.rise) {
    tangents.push(unit(toBelow.x, toBelow.y - 0.3));
  }
  tangents.push(unit(side, -0.25), up);

  // share the samples between the spans by length
  const spans = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = spans.reduce((a, b) => a + b, 0) || 1;
  const counts = spans.map((l) => Math.max(1, Math.round((l / total) * samples)));
  while (counts.reduce((a, b) => a + b, 0) > samples) counts[counts.indexOf(Math.max(...counts))]--;
  while (counts.reduce((a, b) => a + b, 0) < samples) counts[counts.indexOf(Math.max(...counts))]++;

  const line: Point[] = [{ ...from }];
  spans.forEach((len, i) => {
    const a = pts[i];
    const b = pts[i + 1];
    // short handles keep long limbs from swinging past their waypoints into an S
    const h = Math.min(len / 3, MAX_HANDLE);
    const c1 = { x: a.x + tangents[i].x * h, y: a.y + tangents[i].y * h };
    const c2 = { x: b.x - tangents[i + 1].x * h, y: b.y - tangents[i + 1].y * h };
    line.push(...sampleCubic(a, c1, c2, b, counts[i]).slice(1));
  });

  // seeded kinks across the limb, fading out at both ends (and kept small on short limbs)
  const wander = noise1D(rnd, 9);
  const amp = Math.min(11, total * 0.022);
  const n = normals(line);
  return line.map((p, i) => {
    const t = i / samples;
    // calm near the person, so the kinks never nudge the limb into the portrait or banner
    const settle = Math.min(1, Math.hypot(p.x - to.x, p.y - to.y) / 250);
    const k = wander(t) * amp * Math.sin(Math.PI * t) * settle;
    return { x: p.x + n[i].x * k, y: p.y + n[i].y * k };
  });
}

/** Organic branch along the genealogical link, with bark and a few twigs reaching into the foliage. */
export function engravedBranch(seg: BranchSegment, endWidth?: number): EngravedBranch {
  const rnd = seededRandom(hashSeed(seg.id) ^ 0x5bd1e995);
  const dx = seg.to.x - seg.from.x;
  const dy = seg.to.y - seg.from.y;
  const samples = 24;
  const isRoot = seg.parentHouseholdId === null;
  const centre = isRoot ? rootCentreline(seg, samples) : branchCentreline(seg, samples);
  const widths = branchWidths(seg.generation, seg.weight);
  const start = isRoot ? TAPROOT_WIDTH : widths.start;
  const tip = endWidth ?? widths.end;
  const half = limbHalfWidths(start, tip, samples);

  let twigs = '';
  const length = Math.hypot(dx, dy);
  const count = length < 1 || isRoot ? 0 : 2 + Math.floor(length / 70);
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

  // bark begins once the limb has cleared its parent's wood (about one limb-width out from where it leaves)
  const out = Math.max(1, centre.findIndex((p) => Math.hypot(p.x - seg.from.x, p.y - seg.from.y) > start));
  const barkCentre = out > 0 && out < samples - 1 ? centre.slice(out) : centre;
  const barkHalf = barkCentre === centre ? half : half.slice(out);
  return {
    body: ribbonOutline(centre, half),
    grooves: barkGrooves(barkCentre, barkHalf, rnd, Math.max(2, Math.min(6, Math.round(start / 5)))),
    shading: sideShading(barkCentre, barkHalf, rnd, 1),
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
      if (!inside(next) || next.y < base.y - ROOT_TUCK - 6) {
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
    grow({ x: sx, y: base.y - ROOT_TUCK }, a, w, len, 3);
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
