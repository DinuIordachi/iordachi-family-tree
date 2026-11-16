import { WoodTip } from './canopy-wood';
import { FRUIT_KINDS, placeFruits } from './fruits';

const tips: WoodTip[] = Array.from({ length: 60 }, (_, i) => ({
  at: { x: (i % 10) * 90, y: Math.floor(i / 10) * 90 },
  dir: { x: 0, y: -1 },
  width: 2,
}));

describe('placeFruits', () => {
  it('hangs up to the requested count, keeping them apart', () => {
    const fruit = placeFruits(tips, { seed: 1, allowed: () => true, count: 8, minGap: 150 });
    expect(fruit).toHaveLength(8);
    for (const a of fruit) {
      for (const b of fruit) {
        if (a !== b) expect(Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y)).toBeGreaterThanOrEqual(150);
      }
    }
  });

  it('shows every symbol before any repeats', () => {
    const fruit = placeFruits(tips, { seed: 3, allowed: () => true, count: 4, minGap: 1 });
    expect(new Set(fruit.map((f) => f.kind)).size).toBe(FRUIT_KINDS.length);
  });

  it('never hangs a fruit where any part of it would cover a portrait', () => {
    const blocked = (p: { x: number; y: number }) => !(p.x > 100 && p.x < 400 && p.y > 0 && p.y < 300);
    const fruit = placeFruits(tips, { seed: 2, allowed: blocked, count: 30, minGap: 1 });
    for (const f of fruit) {
      expect(f.at.x > 60 && f.at.x < 440 && f.at.y > -60 && f.at.y < 300).toBe(false);
    }
  });

  it('only uses slender twig ends, and is deterministic for a seed', () => {
    const thick = tips.map((t) => ({ ...t, width: 14 }));
    expect(placeFruits(thick, { seed: 1, allowed: () => true, count: 5 })).toEqual([]);
    const a = placeFruits(tips, { seed: 9, allowed: () => true, count: 6 });
    expect(placeFruits(tips, { seed: 9, allowed: () => true, count: 6 })).toEqual(a);
  });
});
