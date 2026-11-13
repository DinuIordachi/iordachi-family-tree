import { branchWidths } from './branch-geometry';
import { jointWeb } from './canopy-wood';
import { MEDALLION_TOP } from './medallion-geometry';
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
  /** The curved web joining the limb to the wood it grows from (drawn apart, so it never highlights). */
  web: string;
  /** The limb's centreline and half-widths, for the crown's lesser wood to grow out of. */
  centre: Point[];
  half: number[];
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
const COLLAR = 0.35;
/** …over about this fraction of its length. */
const COLLAR_LENGTH = 0.09;
/** Width at the trunk base of the root that runs down to a founder couple (the trunk base is ~92 wide). */
const TAPROOT_WIDTH = 90;
/** Roots start this far inside the trunk base, so the trunk's fill hides where they begin. */
const ROOT_TUCK = 10;
/** Slightly above 1: a limb thins steadily, a little faster near its start, never in steps. */
const TAPER = 1.15;

/**
 * Half-widths along a limb: an even, smooth taper from its start width to exactly half the tip width.
 * Where it grows out of the trunk (`collar`), it flares into the trunk's wood first; a limb carrying on
 * past a fork does not, so a whole limb thins continuously from the trunk to its last twig.
 */
export function limbHalfWidths(start: number, tip: number, samples: number, collar = true): number[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const body = tip + (start - tip) * Math.pow(1 - t, TAPER);
    return (body * (1 + (collar ? COLLAR * Math.exp(-t / COLLAR_LENGTH) : 0) * (1 - t))) / 2;
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

/**
 * Gnarled trunk: flared buttresses at the ground, wavering contour, bark grooves, knots and shading.
 * `widthAt(t)` gives its width from the base (t = 0) to the top (t = 1) — thinner above every limb
 * that leaves it; without one it tapers evenly from `baseWidth`.
 */
export function engravedTrunk(
  trunk: TreeLayout['trunk'],
  seed: number,
  baseWidth = 92,
  widthAt?: (t: number) => number,
): EngravedTrunk {
  const rnd = seededRandom(seed);
  const { base, top } = trunk;
  const samples = 44;
  const sway = noise1D(rnd, 6);
  const bumps = noise1D(rnd, 18);
  // as wide at the top as the main limb's collar, so the leader grows out of it without a step
  const topHalf = (widthAt ? widthAt(1) : branchWidths(0).start * TRUNK_TOP_RATIO) / 2;
  const baseHalf = (widthAt ? widthAt(0) : baseWidth) / 2;
  const centre: Point[] = [];
  const half: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    centre.push({ x: base.x + (top.x - base.x) * t + sway(t) * 7 * Math.sin(Math.PI * t), y: base.y + (top.y - base.y) * t });
    const taper = widthAt ? widthAt(t) / 2 : topHalf + (baseHalf * 0.62 - topHalf) * Math.pow(1 - t, 1.6);
    // the foot flares into buttresses where it meets the ground
    const flare = baseHalf * (widthAt ? 0.7 : 0.38) * Math.pow(1 - t, 7);
    half.push(Math.max(topHalf, taper + flare + bumps(t) * 2.2 * (1 - t)));
  }
  half[samples] = topHalf;

  let knots = '';
  for (let k = 0; k < 3; k++) {
    const i = Math.round(samples * (0.22 + 0.2 * k + rnd() * 0.1));
    const side = k % 2 === 0 ? -0.42 : 0.38;
    const [p] = offsetLine([centre[i]], [half[i]], side).length ? [offsetLine(centre, half, side)[i]] : [centre[i]];
    const rx = Math.max(3.5, half[i] * 0.09) + rnd() * 2.5;
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

/** Where a household's portraits hang from: the twig point just above them (and their fork, for a couple). */
export const HANG_ABOVE = MEDALLION_TOP + 44;
export const hangPoint = (centre: Point): Point => ({ x: centre.x, y: centre.y - HANG_ABOVE });

/** A limb leaves the trunk climbing between these angles (degrees above the horizontal)… */
const LEAVE_MIN = 30;
const LEAVE_MAX = 60;
/** …and arrives turned this much further upward than its chord, bending toward the light. */
const ARRIVE_LIFT = 15;
/** Longest curve handle, as a share of the span: enough to arch, too short to loop. */
const HANDLE = 0.4;

const unit = (x: number, y: number): Point => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};
/** A direction `deg` degrees above the horizontal, pointing to `side`. */
const heading = (side: number, deg: number): Point => ({ x: side * Math.cos((deg * Math.PI) / 180), y: -Math.sin((deg * Math.PI) / 180) });
const degreesUp = (v: Point) => (Math.atan2(-v.y, Math.abs(v.x)) * 180) / Math.PI;

/** The limb centreline the canopy's leaf masses were laid out against (kept so the crown keeps its shape). */
function canopyCentreline(seg: BranchSegment, samples = 24): Point[] {
  const rnd = seededRandom(hashSeed(seg.id));
  const start = seg.rise ? hangPoint(seg.from) : seg.from;
  const end = hangPoint(seg.to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    return Array.from({ length: samples + 1 }, () => ({ ...start }));
  }
  const side = Math.sign(dx) || 1;
  const chordUp = degreesUp({ x: dx, y: dy });
  const upright = Math.abs(dx) < length * 0.08;
  const leave = upright ? { x: 0, y: -1 } : heading(side, Math.max(LEAVE_MIN, Math.min(LEAVE_MAX, seg.rise ? chordUp - 8 : chordUp)));
  const arrive = upright ? { x: 0, y: -1 } : heading(side, Math.min(85, Math.max(chordUp, 0) + ARRIVE_LIFT));
  const h = length * HANDLE;
  const line = sampleCubic(
    start,
    { x: start.x + leave.x * h, y: start.y + leave.y * h },
    { x: end.x - arrive.x * h, y: end.y - arrive.y * h },
    end,
    samples,
  );
  const wander = noise1D(rnd, 7);
  const amp = Math.min(6, length * 0.012);
  const n = normals(line);
  return line.map((p, i) => {
    const t = i / samples;
    const k = wander(t) * amp * Math.sin(Math.PI * t);
    return { x: p.x + n[i].x * k, y: p.y + n[i].y * k };
  });
}

/** Neighbouring anchors of a limb, so consecutive limbs join as one smooth Catmull-Rom curve. */
export interface LimbContext {
  /** Where the limb this one grows out of starts (its anchor before this limb's start). */
  prev?: Point;
  /** Where the limb that carries on from this one's end finishes (the anchor after its end). */
  next?: Point;
  /** This limb carries its parent's line straight on (rather than forking off it). */
  continues?: boolean;
}

/** A limb's anchors: where it starts (on the trunk, or the twig point it rises from) and ends. */
export const limbStart = (seg: BranchSegment): Point => (seg.rise ? hangPoint(seg.from) : seg.from);
export const limbEnd = (seg: BranchSegment): Point => hangPoint(seg.to);

/**
 * Each limb's neighbours: the limb it grows from and the heaviest limb carrying on from it. Drawn
 * through these as a Catmull-Rom chain, a line of descent is one smooth curve through every portrait's
 * twig point instead of straight spans meeting at corners.
 */
export function limbContexts(layout: TreeLayout): Map<string, LimbContext> {
  const limbs = layout.branches.filter((b) => b.parentHouseholdId !== null && !b.graft);
  const into = new Map(limbs.map((b) => [b.childHouseholdId, b]));
  const heaviest = new Map<string, BranchSegment>();
  for (const b of limbs) {
    const best = heaviest.get(b.parentHouseholdId!);
    if (b.rise && (!best || (b.weight ?? 1) > (best.weight ?? 1))) heaviest.set(b.parentHouseholdId!, b);
  }
  const out = new Map<string, LimbContext>();
  for (const b of limbs) {
    const parent = b.rise ? into.get(b.parentHouseholdId!) : undefined;
    const next = heaviest.get(b.childHouseholdId);
    out.set(b.id, {
      prev: parent ? limbStart(parent) : undefined,
      next: next ? limbEnd(next) : undefined,
      continues: !!parent && heaviest.get(b.parentHouseholdId!)?.id === b.id,
    });
  }
  return out;
}

/** A limb leaves the trunk this many degrees off the trunk's line: steep, then curving outward. */
const OFF_TRUNK_MIN = 25;
const OFF_TRUNK_MAX = 50;
/** A fork turns off the line it grows from by at most this much where it leaves. */
const FORK_MAX = 40;

/** `v` turned toward `to` by at most `maxDeg` degrees. */
function turnToward(v: Point, to: Point, maxDeg: number): Point {
  const a = Math.atan2(v.y, v.x);
  let d = Math.atan2(to.y, to.x) - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const lim = (maxDeg * Math.PI) / 180;
  const r = a + Math.max(-lim, Math.min(lim, d));
  return { x: Math.cos(r), y: Math.sin(r) };
}

/**
 * Centreline of a branch grown like a real limb: one smooth curve, no corners. Off the trunk it leaves
 * steeply (25–50° off the trunk's line), runs up beside it briefly, then curves outward and up to the
 * twig point above its household. A limb carrying on from a fork continues its parent's curve
 * (Catmull-Rom tangents through the anchors), and a side fork turns off it by at most 40°. Seeded
 * kinks along the way keep it from reading as a drafted curve.
 */
export function branchCentreline(seg: BranchSegment, samples = 24, ctx: LimbContext = {}): Point[] {
  const rnd = seededRandom(hashSeed(seg.id));
  const start = limbStart(seg);
  const end = limbEnd(seg);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    return Array.from({ length: samples + 1 }, () => ({ ...start }));
  }
  const side = Math.sign(dx) || 1;
  const chord = unit(dx, dy);
  const chordUp = degreesUp({ x: dx, y: dy });
  const upright = Math.abs(dx) < length * 0.08 && (!ctx.next || Math.abs(ctx.next.x - end.x) < length * 0.08);

  let leave: Point;
  let h0 = length * HANDLE;
  if (upright) {
    leave = { x: 0, y: -1 };
  } else if (!seg.rise) {
    // off the trunk: steeply up beside it first, the long handle carrying it up before it spreads
    const off = Math.max(OFF_TRUNK_MIN, Math.min(OFF_TRUNK_MAX, 90 - chordUp));
    leave = heading(side, 90 - off);
    h0 = length * 0.5;
  } else if (ctx.prev) {
    const along = unit(start.x - ctx.prev.x, start.y - ctx.prev.y);
    leave = ctx.continues ? unit(end.x - ctx.prev.x, end.y - ctx.prev.y) : turnToward(along, chord, FORK_MAX);
    if (leave.y > 0.2) leave = turnToward(leave, { x: 0, y: -1 }, 60); // never set off downward
  } else {
    leave = heading(side, Math.max(LEAVE_MIN, Math.min(LEAVE_MAX, chordUp - 8)));
  }
  let arrive: Point;
  if (upright) {
    arrive = { x: 0, y: -1 };
  } else if (ctx.next) {
    arrive = unit(ctx.next.x - start.x, ctx.next.y - start.y);
  } else {
    arrive = heading(side, Math.min(85, Math.max(chordUp, 0) + ARRIVE_LIFT));
  }
  const h1 = length * 0.36;
  const line = sampleCubic(
    start,
    { x: start.x + leave.x * h0, y: start.y + leave.y * h0 },
    { x: end.x - arrive.x * h1, y: end.y - arrive.y * h1 },
    end,
    samples,
  );

  // seeded kinks across the limb, fading out at both ends (and kept small on short limbs)
  const wander = noise1D(rnd, 7);
  const amp = upright ? 0 : Math.min(5, length * 0.01);
  const n = normals(line);
  return line.map((p, i) => {
    const t = i / samples;
    const k = wander(t) * amp * Math.sin(Math.PI * t);
    return { x: p.x + n[i].x * k, y: p.y + n[i].y * k };
  });
}

/**
 * The twigs a household's portraits hang from, like fruit: a single person on a short stem dropping
 * from the twig point; a couple on a short fork that splits into two tips, one stem down to each.
 */
export function hangers(layout: TreeLayout): string {
  const households = new Map<string, Point[]>();
  for (const m of layout.members) {
    if (m.generation === 0 && m.center.y > layout.trunk.base.y) continue; // the founders sit among the roots
    households.set(m.householdId, [...(households.get(m.householdId) ?? []), m.center]);
  }
  let out = '';
  for (const people of households.values()) {
    const centre = { x: people.reduce((s, p) => s + p.x, 0) / people.length, y: people[0].y };
    const from = hangPoint(centre);
    for (const p of people) {
      const top = { x: p.x, y: p.y - MEDALLION_TOP + 10 };
      const dx = top.x - from.x;
      const pts = sampleCubic(
        from,
        { x: from.x + dx * 0.45, y: from.y - 10 },
        { x: top.x, y: from.y - 4 },
        top,
        12,
      );
      const half = pts.map((_, i) => (people.length > 1 ? 5.5 : 4.5) * (1 - (0.55 * i) / (pts.length - 1)));
      out += ribbonOutline(pts, half);
    }
  }
  return out;
}

/**
 * A limb along the genealogical link: one tapered, filled shape from its base to its tip, with bark.
 * Where it leaves the trunk or forks off its parent limb, a curved web joins it to that wood, as bark
 * swells where a real limb grows out. The crown's lesser branches and twigs are grown separately
 * (`growCrownWood`), out of these limbs.
 */
export function engravedBranch(seg: BranchSegment, endWidth?: number, ctx: LimbContext = {}): EngravedBranch {
  const rnd = seededRandom(hashSeed(seg.id) ^ 0x5bd1e995);
  const samples = 32;
  const isRoot = seg.parentHouseholdId === null;
  const centre = isRoot ? rootCentreline(seg, samples) : branchCentreline(seg, samples, ctx);
  const widths = branchWidths(seg.generation, seg.weight);
  const start = isRoot ? TAPROOT_WIDTH : widths.start;
  const tip = endWidth ?? widths.end;
  // only a limb growing straight out of the trunk (not one carrying on from a fork) flares at its base
  const half = limbHalfWidths(start, tip, samples, isRoot || !seg.rise);

  // the web joining it to the wood it grows from: the trunk (running straight up), or its parent limb
  let web = '';
  // a limb carrying the trunk's own line straight on needs no web: it is the trunk
  const straightOn = Math.abs(centre[centre.length - 1].x - centre[0].x) < Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y) * 0.08;
  if (!isRoot && !ctx.continues && !straightOn) {
    const parentDir = seg.rise && ctx.prev ? { x: centre[0].x - ctx.prev.x, y: centre[0].y - ctx.prev.y } : { x: 0, y: -1 };
    web = jointWeb(centre, half, parentDir, seg.rise ? 1 : 1.6);
  }

  // bark begins once the limb has cleared its parent's wood (about one limb-width out from where it leaves)
  const out = Math.max(1, centre.findIndex((p) => Math.hypot(p.x - centre[0].x, p.y - centre[0].y) > start));
  const barkCentre = out > 0 && out < samples - 1 ? centre.slice(out) : centre;
  const barkHalf = barkCentre === centre ? half : half.slice(out);
  // bark hatching only where the wood is thick enough to carry it
  const thick = start >= 30;
  return {
    body: ribbonOutline(centre, half),
    web,
    grooves: thick ? barkGrooves(barkCentre, barkHalf, rnd, Math.max(2, Math.min(6, Math.round(start / 5)))) : '',
    shading: thick ? sideShading(barkCentre, barkHalf, rnd, 1) : '',
    twigs: '',
    centre,
    half,
  };
}

/** Decorative side branches: wood with bark, plus the tips where their leaf tufts gather. */
export interface Spurs {
  body: string;
  bark: string;
  twigs: string;
  tips: Point[];
}

/** Room a side branch keeps from any portrait, banner or twig point. */
const SPUR_CLEAR = 40;

/**
 * Decorative side branches growing out of the limbs and the upper trunk into the open spaces of the
 * crown, as a real tree's lesser branches do. Each leaves its limb at 35–70°, curves upward toward the
 * light, tapers to a twig and ends in a leaf tuft; none crosses a portrait, its banner, the twig it
 * hangs from, or another side branch. `personGap` is the width of one person's slot.
 */
export function decorativeSpurs(layout: TreeLayout, seed: number, personGap: number): Spurs {
  const rnd = seededRandom(seed);
  const out: Spurs = { body: '', bark: '', twigs: '', tips: [] };
  const aboveGround = layout.members.filter((m) => m.center.y < layout.trunk.base.y);
  // what the side branches keep clear of: every portrait with its banner, and the twig above it
  const keepOut = aboveGround.map((m) => ({
    x1: m.center.x - personGap / 2 - SPUR_CLEAR,
    x2: m.center.x + personGap / 2 + SPUR_CLEAR,
    y1: m.center.y - HANG_ABOVE - SPUR_CLEAR,
    y2: m.center.y + MEDALLION_TOP * 1.4 + SPUR_CLEAR,
  }));
  const clear = (p: Point) => keepOut.every((b) => p.x < b.x1 || p.x > b.x2 || p.y < b.y1 || p.y > b.y2);
  const grown: Point[][] = [];
  const apart = (line: Point[]) => grown.every((g) => line.every((p) => g.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 70)));

  /** The longest of a few lengths that fits where it is. */
  const growFitting = (from: Point, heading: number, baseWidth: number, length: number): boolean =>
    [1, 0.7, 0.5].some((f) => grow(from, heading, baseWidth * (0.7 + 0.3 * f), length * f));
  const grow = (from: Point, heading: number, baseWidth: number, length: number, depth = 1): boolean => {
    // a gentle upward curve: it sets out along `heading` and turns toward the vertical as it goes
    const side = Math.cos(heading) >= 0 ? 1 : -1;
    const end = heading + side * -0.45 * (0.6 + rnd() * 0.8);
    const c1 = { x: from.x + Math.cos(heading) * length * 0.45, y: from.y + Math.sin(heading) * length * 0.45 };
    const tip = { x: from.x + Math.cos((heading + end) / 2) * length, y: from.y + Math.sin((heading + end) / 2) * length };
    const c2 = { x: tip.x - Math.cos(end) * length * 0.3, y: tip.y - Math.sin(end) * length * 0.3 };
    const line = sampleCubic(from, c1, c2, tip, 16);
    if (!line.slice(2).every(clear) || !apart(line)) return false;
    const half = limbHalfWidths(baseWidth, 4, 16, false);
    out.body += ribbonOutline(line, half);
    out.bark += barkGrooves(line, half, rnd, Math.max(1, Math.min(3, Math.round(baseWidth / 10))));
    out.twigs += twig(tip, Math.atan2(tip.y - c2.y, tip.x - c2.x), 26 + rnd() * 20, 3, rnd, 1);
    // a smaller sprig or two along the way
    for (let k = 0; k < 2; k++) {
      const j = 5 + Math.floor(rnd() * 8);
      const t = Math.atan2(line[j + 1].y - line[j].y, line[j + 1].x - line[j].x);
      out.twigs += twig(line[j], t + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.5), 30 + rnd() * 30, Math.max(2.5, half[j]), rnd, 1);
    }
    grown.push(line);
    out.tips.push(tip);
    // a secondary fork partway along, reaching on into the space beside it
    if (length > 220 && depth > 0) {
      const j = 7 + Math.floor(rnd() * 4);
      const along = Math.atan2(line[j + 1].y - line[j].y, line[j + 1].x - line[j].x);
      const turn = side * (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.35);
      grow(line[j], along + turn, half[j] * 1.6, length * (0.45 + rnd() * 0.2), depth - 1);
    }
    return true;
  };

  // along the limbs: a few per limb, more on long ones
  for (const b of layout.branches) {
    if (b.parentHouseholdId === null) continue;
    const centre = canopyCentreline(b, 24);
    const length = centre.reduce((n, p, i) => (i ? n + Math.hypot(p.x - centre[i - 1].x, p.y - centre[i - 1].y) : 0), 0);
    const wide = branchWidths(b.generation, b.weight).start;
    const tries = Math.floor(length / 150);
    for (let k = 0; k < tries; k++) {
      const i = 5 + Math.floor(rnd() * 16);
      const p = centre[i];
      const along = Math.atan2(centre[i + 1].y - p.y, centre[i + 1].x - p.x);
      // off the upper side of the limb, climbing
      for (const turn of [-1, 1]) {
        const heading = along + turn * (0.6 + rnd() * 0.6);
        if (Math.sin(heading) > -0.15) continue; // only branches that climb
        if (growFitting(p, heading, Math.max(10, Math.min(34, wide * 0.45)), 240 + rnd() * 300)) break;
      }
    }
  }
  // from the upper trunk, where it runs up through the crown between the limbs
  const { base, top } = layout.trunk;
  for (let k = 0; k < 24; k++) {
    const y = top.y + (base.y - top.y) * (0.05 + rnd() * 0.65);
    const side = k % 2 ? 1 : -1;
    const heading = -Math.PI / 2 + side * (0.55 + rnd() * 0.55);
    growFitting({ x: base.x + side * 20, y }, heading, 34, 260 + rnd() * 320);
  }
  return out;
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
