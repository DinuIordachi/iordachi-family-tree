import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { Clearing, generateFoliage } from './foliage';
import { member } from './testing/member-factory';
import { SEED_MEMBERS } from './testing/seed-fixture';
import { TreeLayout } from './types';

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
    expect(anchors(f.lit).length + anchors(f.shade).length + anchors(f.light).length).toBe(f.leafCount);
  });

  it('gathers leaves at the outer tips, sparse toward the trunk', () => {
    // two like households at the same height on one limb: one near the trunk, one far out
    const limb = {
      members: [
        { id: 'a', householdId: 'a', generation: 1, center: { x: 260, y: -900 } },
        { id: 'b', householdId: 'b', generation: 2, center: { x: 1400, y: -900 } },
      ],
      branches: [
        { id: 'r>a', parentHouseholdId: 'r', childHouseholdId: 'a', from: { x: 0, y: -500 }, to: { x: 260, y: -900 }, generation: 1 },
        { id: 'a>b', parentHouseholdId: 'a', childHouseholdId: 'b', from: { x: 260, y: -900 }, to: { x: 1400, y: -900 }, generation: 2 },
      ],
      trunk: { base: { x: 0, y: 0 }, top: { x: 0, y: -400 } },
    } as unknown as TreeLayout;
    const g = generateFoliage(limb, { seed: 5, clearings: [] });
    const near = (x: number) => [...anchors(g.lit), ...anchors(g.shade), ...anchors(g.light)].filter((p) => Math.abs(p.x - x) < 150).length;
    expect(near(1400)).toBeGreaterThan(1.5 * near(260));
  });

  it('leaves the trunk bare below the crown', () => {
    const axis = layout.trunk.base.x;
    const onTrunk = [...anchors(f.lit), ...anchors(f.shade), ...anchors(f.light)].filter(
      (p) => p.y > layout.trunk.top.y + 20 && Math.abs(p.x - axis) < 40,
    );
    expect(onTrunk).toEqual([]);
  });

  it('varies leaves in tone: a few in a lighter shade among the outlined and filled ones', () => {
    expect(anchors(f.light).length).toBeGreaterThan(20);
    expect(anchors(f.light).length).toBeLessThan(anchors(f.lit).length);
  });

  it('sets one continuous canopy silhouette behind the leaves, not separate clumps', () => {
    expect(f.canopy).toMatch(/^M[^M]*Z$/); // a single closed outline
    expect(f.canopy).not.toContain('NaN');
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

  it('reaches down over the lowest families, but stays clear of the ground and the figures at the trunk base', () => {
    const lowest = Math.max(...[...anchors(f.lit), ...anchors(f.shade), ...anchors(f.light)].map((p) => p.y));
    expect(lowest).toBeLessThan(layout.trunk.base.y - 150);
  });

  it('takes every family above the ground inside the one canopy outline', () => {
    const pts = [...f.canopy.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    for (const m of layout.members.filter((q) => q.center.y < layout.trunk.base.y)) {
      // the outline passes on both sides of, and below, every portrait
      expect(pts.some((p) => p.x < m.center.x && Math.abs(p.y - m.center.y) < 200)).toBe(true);
      expect(pts.some((p) => p.x > m.center.x && Math.abs(p.y - m.center.y) < 200)).toBe(true);
      expect(Math.max(...pts.map((p) => p.y))).toBeGreaterThan(m.center.y);
    }
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
