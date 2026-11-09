import { hashSeed, seededRandom } from '../tree/engraving/seeded-random';
import { ACCENT, GEOMETRY, LifeLayout, PALETTE } from './life-layout';
import { distToSeg, pathPoints, pathSegs, polyD, Pt, samplePolyline, Seg } from './life-geometry';
import { motifHalf, motifScale } from './ornament-scale';

export { pathPoints } from './life-geometry';

/** Original ornament elements that decorate the crown between members. */
export const ELEMENT_KINDS = ['disc', 'leaf', 'pomegranate', 'energy', 'heart', 'textile', 'flower', 'basil', 'glass'] as const;
/**
 * Line endings from the ornament, drawn at the line's own weight with no element:
 * - comb: the diagonal carries three short upright prongs toward its end;
 * - cross: the diagonal turns upright and ends in a short crossbar.
 */
export const TIP_KINDS = ['comb', 'cross'] as const;
export const DECOR_KINDS = [...ELEMENT_KINDS, ...TIP_KINDS] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];
export type TipKind = (typeof TIP_KINDS)[number];
export type DecorKind = ElementKind | TipKind;
export const isTip = (k: DecorKind): k is TipKind => (TIP_KINDS as readonly string[]).includes(k);

/**
 * Elements the ornament turns on the 45° grid. The key (textile) is turned so
 * its solid corner meets the line and both arms run away from it, the way the
 * logo draws it. Rotation is applied before the outward mirroring.
 */
export const ROTATION: Partial<Record<DecorKind, number>> = { textile: 45 };

/**
 * How each element joins its sprig, as in the ornament: side-mounted ones
 * (key, heart, leaf) take a short horizontal run off the 45° line; upright
 * ones (glass, pomegranate) sit on a short vertical stalk; basil takes the
 * diagonal straight through its open slot to its heart; the rest stay on the
 * diagonal, just touching.
 */
export const CONNECTOR: Record<ElementKind, 'horizontal' | 'vertical' | 'diagonal' | 'slot'> = {
  textile: 'horizontal',
  heart: 'horizontal',
  leaf: 'horizontal',
  glass: 'vertical',
  pomegranate: 'vertical',
  disc: 'diagonal',
  energy: 'diagonal',
  flower: 'diagonal',
  basil: 'slot',
};

/**
 * Where a side-mounted element meets its line, in the element's own units
 * (on the centreline of its outline), as the ornament joins them: the leaf at
 * its upper acute corner, the run continuing its top edge; the heart at its tip.
 */
export const ANCHOR: Partial<Record<ElementKind, Pt>> = {
  leaf: [47, -18.8],
  heart: [32.5, 0],
};

/** Each element's own colour in the ornament (textile ochre, flower blue, chip wine, ...). */
export const OWN_COLOR: Record<ElementKind, string> = {
  textile: PALETTE.ochre,
  flower: PALETTE.blue,
  energy: PALETTE.wine,
  disc: PALETTE.green,
  heart: PALETTE.blue,
  leaf: PALETTE.forest,
  pomegranate: PALETTE.orange,
  basil: PALETTE.magenta,
  glass: PALETTE.forest,
};

export interface LifeDecoration {
  id: string;
  /** Sprig from a branch (or the stem): 45° first, then the element's connector or the tip's pattern. */
  stub: string;
  /** The same sprig as separate lines, so where a prong meets its diagonal the overlap reads as a joint. */
  lines: string[];
  stubColor: string;
  kind: DecorKind;
  color: string;
  accent: string;
  x: number;
  y: number;
  /** -1 when the sprig grows to the left: asymmetric elements face outward. */
  facing: 1 | -1;
  /** Degrees the element is turned (before mirroring), see ROTATION. */
  rotate: number;
  /** -1 to flip vertically, so basil's open slot faces a sprig coming from below. */
  flip: 1 | -1;
  /** A line ending only: the pattern is all in `stub`, there is no element. */
  tip: boolean;
}

const COLORS = [PALETTE.orange, PALETTE.red, PALETTE.wine, PALETTE.magenta, PALETTE.green, PALETTE.forest, PALETTE.blue, PALETTE.ochre, PALETTE.peach];

export const DECOR = {
  sprig: 30,
  /** Length of the straight run after the diagonal, for side/upright elements. */
  run: 22,
  /** How far a line's end tucks into the element it joins. */
  tuck: 6,
  /** Extra diagonal length that carries a basil sprig into the flower's heart. */
  slotReach: 22,
  /** Length of a tip's diagonal along each axis. */
  tipReach: 70,
  /** Spacing of a comb's prongs along the diagonal (each axis), and their height. */
  combStep: 22,
  prong: 24,
  /** A cross: its upright, and the crossbar's half width and drop from the top. */
  crossRise: 36,
  crossHalf: 16,
  crossDrop: 14,
  step: 36,
  minHostLength: 90,
  spacing: 130,
  branchClear: 32,
} as const;

/**
 * Scatters small sprigs over free space in the crown. Decorations use only
 * elements no generation wears, so the legend's meanings stay true, and
 * favour plain line endings, so members stay the tree's main marks. Like the
 * symbol, every sprig grows upward. Deterministic for a given family.
 */
export function decorate(layout: LifeLayout, seedKey = ''): LifeDecoration[] {
  if (!layout.motifs.length) return [];
  const D = DECOR;
  const G = GEOMETRY;
  const rnd = seededRandom(hashSeed('tree-of-life', seedKey, ...layout.motifs.map((m) => m.id)));
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)];
  const worn = new Set<string>(layout.motifs.map((m) => m.motif));
  const elementKinds = ELEMENT_KINDS.filter((k) => !worn.has(k));
  const kinds: DecorKind[] = [...elementKinds, ...TIP_KINDS];

  const segs: { seg: Seg; color: string }[] = [];
  for (const x of [...layout.branches, ...layout.bonds]) for (const seg of pathSegs(x.d)) segs.push({ seg, color: x.color });
  const stem: Seg = [[layout.trunk.x, layout.trunk.bottom], [layout.trunk.x, layout.trunk.top]];
  segs.push({ seg: stem, color: PALETTE.green });
  // Chevrons block like any line, but are too short to grow sprigs.
  const leafSegs: Seg[] = layout.leaves.flatMap((l) => l.lines.flatMap((x) => pathSegs(x.d)));

  // Candidate sprouting points along straight runs, away from their ends.
  interface Candidate {
    host: number;
    p: Pt;
    dir: Pt;
  }
  const candidates: Candidate[] = [];
  segs.forEach(({ seg: [a, b] }, host) => {
    const horizontal = a[1] === b[1];
    const vertical = a[0] === b[0];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if ((!horizontal && !vertical) || len < D.minHostLength) return;
    for (let t = D.step; t <= len - D.step; t += D.step) {
      const p: Pt = [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len];
      for (const dir of [[1, -1], [-1, -1]] as Pt[]) candidates.push({ host, p, dir });
    }
  });

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Members with their labels (above, or beside a single parent).
  const keepOut = layout.motifs.map((m) => {
    const hw = Math.max(m.half.w, m.label === 'above' ? G.labelWidth / 2 : 0);
    return {
      x1: m.x - hw - (m.label === 'left' ? G.sideLabel : 0),
      x2: m.x + hw + (m.label === 'right' ? G.sideLabel : 0),
      y1: m.y - m.top - G.labelBlock,
      y2: m.y + m.half.h,
    };
  });
  const inKeepOut = (pt: Pt, pad: number) =>
    keepOut.some((k) => pt[0] > k.x1 - pad && pt[0] < k.x2 + pad && pt[1] > k.y1 - pad && pt[1] < k.y2 + pad);
  const target = Math.max(4, Math.min(24, Math.round(layout.motifs.length / 2)));
  const out: LifeDecoration[] = [];

  /** Polylines of a tip pattern sprouting at p, growing along dir (always upward). */
  const tipLines = (p: Pt, dir: Pt, kind: TipKind): Pt[][] => {
    const [dx, dy] = dir;
    const e: Pt = [p[0] + dx * D.tipReach, p[1] + dy * D.tipReach];
    if (kind === 'cross') {
      const top: Pt = [e[0], e[1] - D.crossRise];
      const bar = top[1] + D.crossDrop;
      return [[p, e, top], [[e[0] - D.crossHalf, bar], [e[0] + D.crossHalf, bar]]];
    }
    const lines: Pt[][] = [[p, e]];
    for (let i = 0; i < 3; i++) {
      const b: Pt = [e[0] - dx * D.combStep * i, e[1] - dy * D.combStep * i];
      lines.push([b, [b[0], b[1] - D.prong]]);
    }
    return lines;
  };

  type Placed = { lines: Pt[][]; c: Pt; rotate: number; flip: 1 | -1 };

  const fitTip = (host: number, p: Pt, dir: Pt, kind: TipKind): Placed | null => {
    const lines = tipLines(p, dir, kind);
    const pts = lines.flat();
    const c: Pt = [pts.reduce((a, x) => a + x[0], 0) / pts.length, pts.reduce((a, x) => a + x[1], 0) / pts.length];
    const samples = lines.flatMap((l) => samplePolyline(l, 10));
    const away = samples.filter((pt) => Math.hypot(pt[0] - p[0], pt[1] - p[1]) > 12);
    if (away.some((pt) => inKeepOut(pt, 10))) return null;
    if (away.some((pt) => pt[1] > layout.girdleY - 40 || pt[0] < layout.bounds.minX || pt[0] > layout.bounds.maxX)) return null;
    if (away.some((pt) => Math.hypot(pt[0] - layout.rose.x, pt[1] - layout.rose.y) < 100)) return null;
    if (out.some((o) => Math.hypot(o.x - c[0], o.y - c[1]) < D.spacing)) return null;
    // The sprig starts on its host, so only its farther part must clear the host.
    const far = samples.filter((pt) => Math.hypot(pt[0] - p[0], pt[1] - p[1]) > 34);
    const blocked =
      segs.some(({ seg }, i) => distToSeg(c, seg) < D.branchClear || (i === host ? far : away).some((pt) => distToSeg(pt, seg) < 24)) ||
      leafSegs.some((seg) => away.some((pt) => distToSeg(pt, seg) < 24));
    if (blocked) return null;
    return { lines, c, rotate: 0, flip: 1 };
  };

  const fit = (host: number, p: Pt, dir: Pt, kind: DecorKind): Placed | null => {
    if (isTip(kind)) return fitTip(host, p, dir, kind);
    const rotate = ROTATION[kind] ?? 0;
    const box = motifHalf(kind);
    // A turned element reaches its corner, not its side.
    const half = rotate ? { w: Math.hypot(box.w, box.h), h: Math.hypot(box.w, box.h) } : box;
    const q: Pt = [p[0] + dir[0] * D.sprig, p[1] + dir[1] * D.sprig];
    let end: Pt = q;
    let c: Pt;
    if (CONNECTOR[kind] === 'horizontal') {
      end = [q[0] + dir[0] * D.run, q[1]];
      const anchor = ANCHOR[kind];
      if (anchor) {
        // The run ends exactly on the element's joining point (the leaf's acute
        // corner, along its top edge; the heart's tip). The element faces the
        // sprig, so its anchor (on its right as drawn) points back along the run.
        const k = motifScale(kind);
        c = [end[0] + dir[0] * anchor[0] * k, end[1] - anchor[1] * k];
      } else {
        c = [end[0] + dir[0] * (half.w - D.tuck), end[1]];
      }
    } else if (CONNECTOR[kind] === 'vertical') {
      end = [q[0], q[1] - D.run];
      c = [end[0], end[1] - (half.h - D.tuck)];
    } else if (CONNECTOR[kind] === 'slot') {
      // One longer diagonal that ends at the flower's heart, through its open slot.
      c = [q[0] + dir[0] * D.slotReach, q[1] + dir[1] * D.slotReach];
      end = c;
    } else {
      // The sprig's end sits just inside the element's rim, along the diagonal.
      const k = (Math.min(half.w, half.h) - D.tuck) / Math.SQRT2;
      c = [q[0] + dir[0] * k, q[1] + dir[1] * k];
    }
    const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const r = Math.max(half.w, half.h);

    if (inKeepOut(c, r)) return null;
    if (c[1] > layout.girdleY - 50 - r || c[0] < layout.bounds.minX || c[0] > layout.bounds.maxX) return null;
    if (Math.hypot(c[0] - layout.rose.x, c[1] - layout.rose.y) < 100 + r) return null;
    if (out.some((o) => Math.hypot(o.x - c[0], o.y - c[1]) < D.spacing)) return null;
    const clear = Math.max(D.branchClear, r + 12);
    const blocked =
      segs.some(({ seg }, i) => {
        // The sprig itself grows from its host; the element must still keep clear of it.
        if (i === host) return distToSeg(c, seg) < clear;
        return distToSeg(c, seg) < clear || distToSeg(mid, seg) < 20 || distToSeg(q, seg) < 22 || distToSeg(end, seg) < 22;
      }) || leafSegs.some((seg) => distToSeg(c, seg) < clear || distToSeg(q, seg) < 22 || distToSeg(end, seg) < 22);
    if (blocked) return null;
    const line: Pt[] =
      CONNECTOR[kind] === 'slot' ? [p, c] : end === q ? [p, q] : [p, q, end]; // basil: one diagonal into the flower
    return { lines: [line], c, rotate, flip: 1 };
  };

  const used = new Map<DecorKind, number>(kinds.map((k) => [k, 0]));
  for (const { host, p, dir } of candidates) {
    if (out.length >= target) break;
    // Line endings first (half of all sprigs), then the least-used kinds, so
    // every free element shows up; ties broken at random.
    const tipsWanted = out.filter((o) => o.tip).length < Math.ceil(target / 2);
    const order = kinds
      .map((k) => ({ k, r: rnd() }))
      .sort(
        (a, b) =>
          (tipsWanted ? Number(isTip(b.k)) - Number(isTip(a.k)) : 0) || used.get(a.k)! - used.get(b.k)! || a.r - b.r,
      )
      .map((x) => x.k);
    let kind: DecorKind | undefined;
    let placed: Placed | null = null;
    for (const k of order) {
      placed = fit(host, p, dir, k);
      if (placed) {
        kind = k;
        break;
      }
    }
    if (!placed || !kind) continue;
    used.set(kind, used.get(kind)! + 1);
    const { lines, c, rotate, flip } = placed;

    // Neither the element nor its sprig may melt into the branch it grows from.
    // Elements keep their own colour from the ornament where they can.
    const hostColor = segs[host].color;
    const own = isTip(kind) ? undefined : OWN_COLOR[kind];
    const color = own && own !== hostColor ? own : pick(COLORS.filter((x) => x !== hostColor));
    const stubColor = pick(COLORS.filter((x) => x !== color && x !== hostColor));
    const ds = lines.map(polyD);
    out.push({
      id: `decor-${out.length}`,
      stub: ds.join(' '),
      lines: ds,
      stubColor,
      kind,
      color,
      accent: ACCENT[color] ?? PALETTE.wine,
      x: c[0],
      y: c[1],
      facing: dir[0] < 0 ? -1 : 1,
      rotate,
      flip,
      tip: isTip(kind),
    });
  }
  return out;
}
