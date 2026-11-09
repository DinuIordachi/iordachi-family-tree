import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';
import { TreeLayout } from './types';

const center = (l: TreeLayout, id: string) => l.members.find((m) => m.id === id)!.center;

function assertNoOverlap(l: TreeLayout) {
  for (const a of l.members) {
    for (const b of l.members) {
      // portraits collide only when on (nearly) the same row
      if (a.id < b.id && Math.abs(a.center.y - b.center.y) < 150) {
        expect(Math.abs(a.center.x - b.center.x)).toBeGreaterThanOrEqual(170 - 1e-6);
      }
    }
  }
}

describe('layoutTree', () => {
  it('grows upward: each generation is higher (smaller y)', () => {
    const l = layoutTree(buildHouseholds(seed), { crownDroop: 0 });
    expect(center(l, '3').y).toBeLessThan(center(l, '1').y);
    expect(center(l, '8').y).toBeLessThan(center(l, '5').y);
    expect(center(l, '3').y - center(l, '5').y).toBe(190);
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

  it('lifts the first generation clear of the figures at the trunk base', () => {
    const l = layoutTree(buildHouseholds(seed));
    // Ștefan stands up to ~240 units tall beside the trunk; banners hang ~94 below each centre
    expect(center(l, '3').y + 94).toBeLessThan(l.trunk.base.y - 240);
  });

  it('sits the founders in the roots below the ground; the trunk rises to their children', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(l.trunk.base.y).toBe(0);
    expect(l.trunk.top.y).toBe(-320); // the fork sits below the first row, so every branch rises
    expect(center(l, '1').y).toBe(135);
    expect(center(l, '2').y).toBe(135);
    expect(center(l, '3').y).toBe(-480);
    expect(l.trunk.base.x).toBe(l.trunk.top.x);
  });

  it('links the founders to the trunk base with a root, and their children to the trunk top', () => {
    const l = layoutTree(buildHouseholds(seed));
    const root = l.branches.find((b) => b.id === 'trunk>1+2')!;
    expect(root.from).toEqual(l.trunk.base);
    expect(root.to.y).toBe(135);
    expect(l.branches.find((b) => b.id === '1+2>3+4')!.from).toEqual(l.trunk.top);
  });

  it('creates one branch per child household plus the trunk link', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(l.branches.map((b) => b.id).sort()).toEqual(['1+2>3+4', '3+4>5+6', '3+4>7', '5+6>8', '5+6>9', 'trunk>1+2']);
    const b = l.branches.find((x) => x.id === '3+4>7')!;
    expect(b.generation).toBe(2);
    expect(b.to).toEqual(center(l, '7'));
  });

  it('single member: one founder in the roots, only the root link', () => {
    const l = layoutTree(buildHouseholds([member('1')]));
    expect(l.members).toHaveLength(1);
    expect(center(l, '1')).toEqual({ x: l.trunk.base.x, y: 135 });
    expect(l.branches.map((b) => b.id)).toEqual(['trunk>1']);
  });

  it('bounds contain every member and the trunk base', () => {
    const l = layoutTree(buildHouseholds(seed));
    for (const m of l.members) {
      expect(m.center.x).toBeGreaterThanOrEqual(l.bounds.minX);
      expect(m.center.x).toBeLessThanOrEqual(l.bounds.maxX);
      expect(m.center.y).toBeGreaterThanOrEqual(l.bounds.minY);
    }
    expect(l.bounds.maxY).toBe(135);
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

  it('centres the sibling with the largest branch, keeping the others in birth order', () => {
    // founders 1+2; children 3 (eldest, has a family) then 4, 5, 6, 7 (no descendants)
    const kids = ['3', '4', '5', '6', '7'];
    const l = layoutTree(
      buildHouseholds([
        member('1', { spouses: ['2'], children: kids }),
        member('2', { spouses: ['1'], children: kids }),
        member('3', { parents: ['1', '2'], children: ['8'] }, { birthday: '1960-01-01' }),
        ...['4', '5', '6', '7'].map((k) => member(k, { parents: ['1', '2'] })),
        member('8', { parents: ['3'] }),
      ]),
    );
    const order = [...kids].sort((a, b) => center(l, a).x - center(l, b).x);
    expect(order).toEqual(['4', '5', '3', '6', '7']);
    expect(center(l, '3').x).toBeCloseTo(l.trunk.base.x);
  });

  it('keeps plain birth order when no sibling branch is larger', () => {
    const l = layoutTree(buildHouseholds(seed));
    expect(center(l, '5').x).toBeLessThan(center(l, '7').x); // 5+6 (has children) vs 7 — two siblings, nothing to centre
  });

  it('respects option overrides', () => {
    const l = layoutTree(buildHouseholds(seed), { generationSpacing: 100, rootRowDepth: 90, crownDroop: 0 });
    expect(center(l, '3').y - center(l, '5').y).toBe(100);
    expect(center(l, '1').y).toBe(90);
  });
});

describe('layoutTree — leader and side limbs', () => {
  // founders 1+2; five married children, the middle-aged one (5) carries the family on
  const kids = ['3', '5', '7', '9', '11'];
  const spouseOf = (k: string) => String(Number(k) + 1);
  const members = [
    member('1', { spouses: ['2'], children: kids }),
    member('2', { spouses: ['1'], children: kids }),
    ...kids.flatMap((k) => [
      member(k, { parents: ['1', '2'], spouses: [spouseOf(k)], children: k === '5' ? ['20', '21'] : [] }),
      member(spouseOf(k), { spouses: [k], children: k === '5' ? ['20', '21'] : [] }),
    ]),
    member('20', { parents: ['5', '6'], children: ['30'] }, { birthday: '1990-01-01' }),
    member('21', { parents: ['5', '6'] }, { birthday: '2000-01-01' }),
    member('30', { parents: ['20'] }),
  ];
  const l = layoutTree(buildHouseholds(members));
  const branch = (to: string) => l.branches.find((b) => b.childHouseholdId === to)!;
  const hx = (id: string) => l.members.find((m) => m.householdId === id)!;
  const dxOf = (id: string) => Math.abs(branch(id).to.x - l.trunk.top.x);

  it('the main line rises straight out of the trunk top', () => {
    expect(branch('5+6').from).toEqual(l.trunk.top);
    expect(branch('5+6').to.x).toBeCloseTo(l.trunk.top.x);
  });

  it('side limbs leave the trunk at different heights, not from one point', () => {
    const sides = ['3+4', '7+8', '9+10', '11+12'];
    const heights = new Set(sides.map((h) => Math.round(branch(h).from.y)));
    expect(heights.size).toBeGreaterThan(1);
    for (const h of sides) {
      expect(branch(h).from.x).toBeCloseTo(l.trunk.top.x);
    }
  });

  it('outer limbs leave the trunk lower than inner ones', () => {
    const sides = ['3+4', '7+8', '9+10', '11+12'].sort((a, b) => dxOf(a) - dxOf(b));
    const inner = branch(sides[0]);
    const outer = branch(sides[sides.length - 1]);
    expect(outer.from.y).toBeGreaterThan(inner.from.y);
  });

  it('every side limb rises from where it leaves the trunk to its household', () => {
    for (const h of ['3+4', '7+8', '9+10', '11+12']) {
      expect(branch(h).to.y).toBeLessThan(branch(h).from.y - 40);
    }
  });

  it('shapes the crown as a dome: households further out sit a little lower', () => {
    const sides = ['3+4', '7+8', '9+10', '11+12'].sort((a, b) => dxOf(a) - dxOf(b));
    expect(hx(sides[sides.length - 1]).center.y).toBeGreaterThan(hx('5+6').center.y);
    expect(hx(sides[sides.length - 1]).center.y).toBeGreaterThanOrEqual(hx(sides[0]).center.y);
  });

  it('weighs each limb by the people it carries', () => {
    expect(branch('5+6').weight).toBe(5); // 5, 6, 20, 21, 30
    expect(branch('3+4').weight).toBe(2);
    expect(branch('21').weight).toBe(1);
  });

  it('a younger sibling leaves the main line above its parents, not from between them', () => {
    const b = branch('21');
    expect(b.from.y).toBeLessThan(hx('5+6').center.y - 60);
    assertNoOverlap(l);
  });
});

describe('layoutTree — second ancestor line', () => {
  const families = [
    member('1', { spouses: ['2'], children: ['3'] }),
    member('2', { spouses: ['1'], children: ['3'] }),
    member('3', { parents: ['1', '2'], spouses: ['6'], children: ['7'] }),
    member('4', { spouses: ['5'], children: ['6'] }),
    member('5', { spouses: ['4'], children: ['6'] }),
    member('6', { parents: ['4', '5'], spouses: ['3'], children: ['7'] }),
    member('7', { parents: ['3', '6'] }),
  ];
  const l = layoutTree(buildHouseholds(families));

  it("sits the spouse's parents in the founders' row, on that spouse's side, clear of everyone", () => {
    expect(center(l, '4').y).toBe(center(l, '1').y);
    expect(center(l, '5').y).toBe(center(l, '1').y);
    expect(Math.min(center(l, '4').x, center(l, '5').x)).toBeGreaterThanOrEqual(Math.max(center(l, '1').x, center(l, '2').x) + 170);
    expect(center(l, '6').x).toBeGreaterThan(center(l, '3').x); // the grafted spouse stands on that side
    assertNoOverlap(l);
  });

  it("roots both founder couples into the trunk, so the second line joins through it (no crossing branch)", () => {
    const ids = l.branches.map((b) => b.id);
    expect(ids).toContain('trunk>1+2');
    expect(ids).toContain('trunk>4+5');
    expect(ids).toContain('1+2>3+6');
    expect(ids).not.toContain('4+5>3+6');
    expect(l.branches.find((b) => b.id === 'trunk>4+5')!.from).toEqual(l.trunk.base);
  });

  it('centres the whole roots row under the trunk, so the roots fan out evenly', () => {
    const row = ['1', '2', '4', '5'].map((id) => center(l, id).x);
    expect((Math.min(...row) + Math.max(...row)) / 2).toBeCloseTo(l.trunk.base.x);
  });
});
