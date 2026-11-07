import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';
import { TreeLayout } from './types';

const center = (l: TreeLayout, id: string) => l.members.find((m) => m.id === id)!.center;

function assertNoOverlap(l: TreeLayout) {
  for (const a of l.members) {
    for (const b of l.members) {
      if (a.id < b.id && a.generation === b.generation) {
        expect(Math.abs(a.center.x - b.center.x)).toBeGreaterThanOrEqual(170 - 1e-6);
      }
    }
  }
}

describe('layoutTree', () => {
  it('grows upward: each generation is higher (smaller y)', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(center(l, '3').y).toBeLessThan(center(l, '1').y);
    expect(center(l, '8').y).toBeLessThan(center(l, '5').y);
    expect(center(l, '1').y - center(l, '3').y).toBe(190);
    expect(l.generationCount).toBe(4);
  });

  it('places spouses side by side in one generation', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(center(l, '3').y).toBe(center(l, '4').y);
    expect(Math.abs(center(l, '3').x - center(l, '4').x)).toBe(170);
  });

  it('never overlaps medallions, even with 12 siblings', () => {
    const kids = Array.from({ length: 12 }, (_, i) => String(i + 3));
    const members = [
      member('1', { spouses: ['2'], children: kids }),
      member('2', { spouses: ['1'], children: kids }),
      ...kids.map((k) => member(k, { parents: ['1', '2'] })),
    ];
    assertNoOverlap(layoutTree(buildHouseholds(members)));
  });

  it('never overlaps medallions across cousins', () => {
    const members = [
      member('1', { children: ['2', '3'] }),
      member('2', { parents: ['1'], spouses: ['20'], children: ['4', '5', '6'] }),
      member('20', { spouses: ['2'], children: ['4', '5', '6'] }),
      member('3', { parents: ['1'], children: ['7', '8', '9'] }),
      ...['4', '5', '6'].map((k) => member(k, { parents: ['2', '20'] })),
      ...['7', '8', '9'].map((k) => member(k, { parents: ['3'] })),
    ];
    assertNoOverlap(layoutTree(buildHouseholds(members)));
  });

  it('trunk base is on the ground below the founders', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(l.trunk.base.y).toBe(0);
    expect(l.trunk.top.y).toBe(-220);
    expect(center(l, '1').y).toBe(-220);
    expect(l.trunk.base.x).toBe(l.trunk.top.x);
  });

  it('creates one branch per child household plus the trunk link', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(l.branches.map((b) => b.id).sort()).toEqual(['1+2>3+4', '3+4>5+6', '3+4>7', '5+6>8', '5+6>9', 'trunk>1+2']);
    const b = l.branches.find((x) => x.id === '3+4>7')!;
    expect(b.generation).toBe(2);
    expect(b.to).toEqual(center(l, '7'));
  });

  it('single member: one member at trunk top, only the trunk branch', () => {
    const l = layoutTree(buildHouseholds([member('1')]));
    expect(l.members).toHaveLength(1);
    expect(center(l, '1')).toEqual(l.trunk.top);
    expect(l.branches.map((b) => b.id)).toEqual(['trunk>1']);
  });

  it('bounds contain every member and the trunk base', () => {
    const l = layoutTree(buildHouseholds(seed));
    for (const m of l.members) {
      expect(m.center.x).toBeGreaterThanOrEqual(l.bounds.minX);
      expect(m.center.x).toBeLessThanOrEqual(l.bounds.maxX);
      expect(m.center.y).toBeGreaterThanOrEqual(l.bounds.minY);
    }
    expect(l.bounds.maxY).toBe(0);
  });

  it('carries unplaced members through', () => {
    expect(layoutTree(buildHouseholds([...seed, member('99')])).unplacedMemberIds).toEqual(['99']);
  });

  it('handles an empty forest', () => {
    const l = layoutTree(buildHouseholds([]));
    expect(l.members).toEqual([]);
    expect(l.branches).toEqual([]);
    expect(l.generationCount).toBe(0);
  });

  it('respects option overrides', () => {
    const l = layoutTree(buildHouseholds(seed), { generationSpacing: 100 });
    expect(center(l, '1').y - center(l, '3').y).toBe(100);
  });
});
