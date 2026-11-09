import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { Clearing, generateFoliage } from './foliage';
import { member } from './testing/member-factory';
import { SEED_MEMBERS } from './testing/seed-fixture';

const layout = layoutTree(buildHouseholds(SEED_MEMBERS));
const clearings: Clearing[] = layout.members.flatMap((m) => [
  { kind: 'ellipse', cx: m.center.x, cy: m.center.y, rx: 52, ry: 60 } as Clearing,
  { kind: 'rect', x: m.center.x - 85, y: m.center.y + 40, w: 170, h: 58 } as Clearing,
]);

/** Every leaf sub-path starts with "M x y" — collect those anchor points. */
const anchors = (d: string) => [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

describe('generateFoliage', () => {
  const f = generateFoliage(layout, { seed: 7, clearings });

  it('engraves thousands of individual leaves', () => {
    expect(f.leafCount).toBeGreaterThan(1500);
    expect(anchors(f.lit).length + anchors(f.shade).length).toBe(f.leafCount);
  });

  it('has lit (outlined), shaded (filled) leaves and shadow hatching', () => {
    expect(anchors(f.lit).length).toBeGreaterThan(300);
    expect(anchors(f.shade).length).toBeGreaterThan(300);
    expect(f.hatch.length).toBeGreaterThan(0);
  });

  it('never draws a leaf over a medallion or its banner', () => {
    for (const p of [...anchors(f.lit), ...anchors(f.shade)]) {
      for (const c of clearings) {
        if (c.kind === 'ellipse') {
          expect(((p.x - c.cx) / c.rx) ** 2 + ((p.y - c.cy) / c.ry) ** 2).toBeGreaterThan(0.9);
        } else {
          const inside = p.x > c.x + 2 && p.x < c.x + c.w - 2 && p.y > c.y + 2 && p.y < c.y + c.h - 2;
          expect(inside).toBe(false);
        }
      }
    }
  });

  it('keeps the trunk visible below the founders', () => {
    const lowest = Math.max(...[...anchors(f.lit), ...anchors(f.shade)].map((p) => p.y));
    expect(lowest).toBeLessThan(layout.trunk.top.y + 70);
  });

  it('stops just below the lowest generation above ground, clear of the figures at the trunk base', () => {
    const lowestRow = Math.max(...layout.members.filter((m) => m.center.y < layout.trunk.base.y).map((m) => m.center.y));
    const lowest = Math.max(...[...anchors(f.lit), ...anchors(f.shade)].map((p) => p.y));
    expect(lowest).toBeLessThan(lowestRow + 110);
  });

  it('caps the leaf count for very large families', () => {
    const kids = Array.from({ length: 40 }, (_, i) => String(i + 2));
    const big = layoutTree(buildHouseholds([member('1', { children: kids }), ...kids.map((k) => member(k, { parents: ['1'] }))]));
    expect(generateFoliage(big, { seed: 1, clearings: [], maxLeaves: 6000 }).leafCount).toBeLessThanOrEqual(6000);
  });

  it('is deterministic and NaN-free', () => {
    const again = generateFoliage(layout, { seed: 7, clearings });
    expect(again.lit).toBe(f.lit);
    expect(`${f.lit}${f.shade}${f.hatch}`).not.toContain('NaN');
  });

  it('is empty for an empty tree', () => {
    expect(generateFoliage(layoutTree(buildHouseholds([])), { seed: 1, clearings: [] }).leafCount).toBe(0);
  });
});
