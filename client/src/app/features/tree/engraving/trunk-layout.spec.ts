import { FamilyMember } from '@app/core/models';
import { buildHouseholds } from './households';
import { member } from './testing/member-factory';
import { layoutTrunkTree } from './trunk-layout';
import { BANNER_BOTTOM, MEDALLION_TOP } from './medallion-geometry';
import { TreeLayout } from './types';

/**
 * Two founder families joined by one couple (3 + 8): the father's family (1 + 2) with four more children,
 * and the mother's (9 + 10) with three more. The couple's son 21 continues the line (children 24, 25);
 * their son 22 married but has no children yet.
 */
function joinedFamilies(): FamilyMember[] {
  const spec: [string, string, string[], string[], string[], string?][] = [
    // id, gender, parents, spouses, children, birthday
    ['1', 'M', [], ['2'], ['3', '4', '5', '6', '7']],
    ['2', 'F', [], ['1'], ['3', '4', '5', '6', '7']],
    ['3', 'M', ['1', '2'], ['8'], ['21', '22'], '1966-01-01'],
    ['4', 'M', ['1', '2'], ['17'], ['27', '28'], '1960-01-01'],
    ['5', 'M', ['1', '2'], ['18'], ['26', '29'], '1962-01-01'],
    ['6', 'F', ['1', '2'], ['19'], ['36', '42'], '1964-01-01'],
    ['7', 'F', ['1', '2'], ['20'], ['37'], '1968-01-01'],
    ['17', 'F', [], ['4'], ['27', '28']],
    ['18', 'F', [], ['5'], ['26', '29']],
    ['19', 'M', [], ['6'], ['36', '42']],
    ['20', 'M', [], ['7'], ['37']],
    ['26', 'M', ['5', '18'], [], []],
    ['29', 'F', ['5', '18'], [], []],
    ['27', 'M', ['4', '17'], [], []],
    ['28', 'F', ['4', '17'], [], []],
    ['36', 'F', ['6', '19'], [], []],
    ['42', 'M', ['6', '19'], ['43'], ['44', '45']],
    ['43', 'F', [], ['42'], ['44', '45']],
    ['44', 'M', ['42', '43'], [], []],
    ['45', 'F', ['42', '43'], [], []],
    ['37', 'M', ['7', '20'], [], []],
    ['9', 'M', [], ['10'], ['8', '11', '12', '13']],
    ['10', 'F', [], ['9'], ['8', '11', '12', '13']],
    ['8', 'F', ['9', '10'], ['3'], ['21', '22'], '1969-01-01'],
    ['11', 'M', ['9', '10'], ['14'], [], '1957-01-01'],
    ['12', 'F', ['9', '10'], ['15'], ['38'], '1959-01-01'],
    ['13', 'F', ['9', '10'], ['16'], ['31', '32', '39'], '1964-01-01'],
    ['14', 'F', [], ['11'], []],
    ['15', 'M', [], ['12'], ['38']],
    ['16', 'M', [], ['13'], ['31', '32', '39']],
    ['38', 'M', ['12', '15'], [], []],
    ['31', 'F', ['13', '16'], [], []],
    ['32', 'M', ['13', '16'], ['33'], ['35'], '1984-01-01'],
    ['33', 'F', [], ['32'], ['35']],
    ['35', 'M', ['32', '33'], [], []],
    ['39', 'F', ['13', '16'], ['40'], ['41'], '1984-01-01'],
    ['40', 'M', [], ['39'], ['41']],
    ['41', 'F', ['39', '40'], [], []],
    ['21', 'M', ['3', '8'], ['23'], ['24', '25'], '1990-01-01'],
    ['23', 'F', [], ['21'], ['24', '25']],
    ['24', 'M', ['21', '23'], [], []],
    ['25', 'M', ['21', '23'], [], []],
    ['22', 'M', ['3', '8'], ['30'], [], '2001-01-01'],
    ['30', 'F', [], ['22'], []],
  ];
  return spec.map(([id, gender, parents, spouses, children, birthday]) =>
    member(id, { parents, spouses, children }, { gender: gender as 'M' | 'F', ...(birthday ? { birthday } : {}) }),
  );
}

function layoutOf(members: FamilyMember[]): TreeLayout | null {
  const byId = new Map(members.map((m) => [m.id, m]));
  return layoutTrunkTree(buildHouseholds(members), { personGap: 170 }, {
    gender: (id) => byId.get(id)?.data.gender,
    parents: (id) => byId.get(id)?.rels.parents ?? [],
  });
}

describe('layoutTrunkTree', () => {
  const family = joinedFamilies();
  const layout = layoutOf(family)!;
  const at = (id: string) => layout.members.find((m) => m.id === id)!.center;

  it('places every member once', () => {
    expect(layout.members.map((m) => m.id).sort()).toEqual(family.map((m) => m.id).sort());
  });

  it('seats the main couple on the trunk, the mother on the left and the father on the right', () => {
    expect(at('8').x + at('3').x).toBe(0);
    expect(at('8').x).toBeLessThan(0);
    expect(at('3').x).toBeGreaterThan(0);
    expect(at('3').y).toBeLessThan(layout.trunk.top.y);
  });

  it('carries the trunk up through the line that branches on, then forks at the crown', () => {
    expect(at('21').x + at('23').x).toBe(0);
    expect(at('21').y).toBeLessThan(at('3').y);
    // the top couple's children fork to both sides
    expect(Math.sign(at('24').x)).toBe(-Math.sign(at('25').x));
    expect(at('24').y).toBeLessThan(at('21').y);
  });

  it("grows the father's family on the right and the mother's on the left, roots included", () => {
    for (const id of ['1', '2', '4', '5', '6', '7', '17', '27', '28', '42', '44', '45', '37']) {
      expect(at(id).x).toBeGreaterThan(0);
    }
    for (const id of ['9', '10', '11', '12', '13', '38', '31', '32', '35', '39', '41']) {
      expect(at(id).x).toBeLessThan(0);
    }
    for (const id of ['1', '2', '9', '10']) {
      expect(at(id).y).toBeGreaterThan(layout.trunk.base.y);
    }
  });

  it('sends brothers and sisters off the trunk at a shallow angle below the couple, youngest highest', () => {
    const limb = (child: string) => layout.branches.find((b) => b.childHouseholdId.split('+').includes(child) && b.from.x === 0)!;
    for (const id of ['4', '5', '6', '7', '11', '12', '13']) {
      const b = limb(id);
      const degrees = (Math.atan2(b.from.y - b.to.y, Math.abs(b.to.x - b.from.x)) * 180) / Math.PI;
      expect(degrees).toBeGreaterThan(8);
      expect(degrees).toBeLessThan(40);
      expect(b.to.y).toBeLessThan(b.from.y);
      expect(b.from.y).toBeGreaterThan(at('3').y);
      expect(b.from.y).toBeLessThan(layout.trunk.base.y);
    }
    expect(limb('7').from.y).toBeLessThan(limb('4').from.y);
    expect(limb('13').from.y).toBeLessThan(limb('11').from.y);
  });

  it('lets both families reach equally far down the trunk, the shorter side spreading its limbs', () => {
    const fromTrunk = layout.branches.filter((b) => b.from.x === 0 && b.parentHouseholdId && ['1+2', '9+10'].includes(b.parentHouseholdId));
    const lowest = (side: number) => Math.max(...fromTrunk.filter((b) => Math.sign(b.to.x) === side).map((b) => b.from.y));
    expect(lowest(-1)).toBeCloseTo(lowest(1), 6);
  });

  it('keeps children close to their parents along a limb, lengthening only branches that would collide', () => {
    const forks = layout.branches.filter((b) => b.rise && b.parentHouseholdId && !['3+8', '21+23'].includes(b.parentHouseholdId));
    expect(forks.length).toBeGreaterThan(5);
    for (const b of forks) {
      // at most about two steps (280 each at this slot width), even where three households fan out
      expect(Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y), b.id).toBeLessThan(2.2 * 280);
    }
  });

  it('keeps every portrait, banner and years clear of every other', () => {
    const boxes = layout.members.map((m) => ({
      id: m.id,
      x1: m.center.x - 80,
      x2: m.center.x + 80,
      y1: m.center.y - MEDALLION_TOP,
      y2: m.center.y + BANNER_BOTTOM,
    }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const overlap = a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('links every household to its parents, so the lineage climbs down to the roots', () => {
    const byChild = new Map(layout.branches.map((b) => [b.childHouseholdId, b]));
    for (const m of layout.members) {
      let b = byChild.get(m.householdId);
      let guard = 0;
      while (b && b.parentHouseholdId && guard++ < 20) b = byChild.get(b.parentHouseholdId);
      expect(b, m.id).toBeDefined();
      expect(b!.parentHouseholdId).toBeNull();
    }
  });

  it('gives up when no single couple carries the family', () => {
    const twins = [
      member('1', { spouses: ['2'], children: ['3', '4'] }),
      member('2', { spouses: ['1'], children: ['3', '4'] }, { gender: 'F' }),
      member('3', { parents: ['1', '2'], children: ['5'] }),
      member('4', { parents: ['1', '2'], children: ['6'] }),
      member('5', { parents: ['3'] }),
      member('6', { parents: ['4'] }),
    ];
    expect(layoutOf(twins)).toBeNull();
  });
});
