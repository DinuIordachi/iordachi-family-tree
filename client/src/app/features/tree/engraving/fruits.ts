import { WoodTip } from './canopy-wood';
import { seededRandom } from './seeded-random';
import { Point } from './types';

/** Moldovan symbols hung on the crown's twig ends like fruit (art in public/motifs/fruit-*.svg). */
export type FruitKind = 'grapes' | 'star' | 'aurochs' | 'rose';
export const FRUIT_KINDS: FruitKind[] = ['grapes', 'star', 'aurochs', 'rose'];

/** Size of each fruit in tree units; every artwork hangs from its top centre. */
export const FRUIT_SIZES: Record<FruitKind, { width: number; height: number }> = {
  grapes: { width: 84, height: 73.5 },
  star: { width: 84, height: 80.5 },
  aurochs: { width: 84, height: 87.5 },
  rose: { width: 84, height: 77 },
};

export interface FruitPlacement {
  kind: FruitKind;
  /** The twig end the fruit hangs from (the artwork's top centre). */
  at: Point;
  /** A slight sway, in degrees. */
  tilt: number;
}

export interface FruitOptions {
  seed: number;
  /** Where a fruit may hang: clear of portraits, banners and ornaments. */
  allowed: (p: Point) => boolean;
  /** How many fruits to hang, at most. */
  count: number;
  /** Fruits keep at least this far apart, so they read as scattered, never as a cluster. */
  minGap?: number;
}

/**
 * Seeded fruit on the crown's twig ends. Only the slender ends are used (fruit grows on fine wood),
 * the whole fruit must hang in allowed space, and the kinds are dealt out in turn so every symbol
 * appears before any repeats.
 */
export function placeFruits(tips: WoodTip[], opts: FruitOptions): FruitPlacement[] {
  const rnd = seededRandom(opts.seed);
  const minGap = opts.minGap ?? 150;
  const order = [...tips]
    .filter((t) => t.width < 12)
    .map((t) => ({ t, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.t);
  const kinds = [...FRUIT_KINDS].sort(() => rnd() - 0.5);
  const out: FruitPlacement[] = [];
  for (const tip of order) {
    if (out.length >= opts.count) break;
    const kind = kinds[out.length % kinds.length];
    const { width, height } = FRUIT_SIZES[kind];
    const { at } = tip;
    // the fruit's outline: both top corners, its sides and its bottom
    const box = [
      { x: at.x - width / 2, y: at.y + 2 },
      { x: at.x + width / 2, y: at.y + 2 },
      { x: at.x - width / 2, y: at.y + height * 0.6 },
      { x: at.x + width / 2, y: at.y + height * 0.6 },
      { x: at.x, y: at.y + height },
    ];
    if (!box.every(opts.allowed)) continue;
    if (out.some((f) => Math.hypot(f.at.x - at.x, f.at.y - at.y) < minGap)) continue;
    out.push({ kind, at, tilt: Math.round((rnd() - 0.5) * 16) });
  }
  return out;
}
