import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { FIXED_MOTIFS, SCATTER_MOTIFS, placeMotifs } from './motif-placement';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';
import { TreeLayout } from './types';

function bigTree(): TreeLayout {
  const kids = Array.from({ length: 12 }, (_, i) => String(i + 2));
  const members = [member('1', { children: kids })];
  let next = 100;
  for (const k of kids) {
    const grandkids = Array.from({ length: 4 }, () => String(next++));
    members.push(member(k, { parents: ['1'], children: grandkids }));
    grandkids.forEach((g) => members.push(member(g, { parents: [k] })));
  }
  return layoutTree(buildHouseholds(members)); // 61 members
}

describe('placeMotifs', () => {
  const seedLayout = layoutTree(buildHouseholds(seed));

  it('always places the five fixed motifs', () => {
    for (const layout of [seedLayout, layoutTree(buildHouseholds([member('1')]))]) {
      const ids = placeMotifs(layout, 1).map((m) => m.motif);
      for (const f of FIXED_MOTIFS) {
        expect(ids).toContain(f);
      }
    }
  });

  it('keeps the ground by the trunk free of figures: only the shield, the arms and the river', () => {
    const p = placeMotifs(seedLayout, 1);
    const at = (id: string) => p.find((m) => m.motif === id)!;
    expect(p.some((m) => m.motif === 'stefan-cel-mare' || m.motif === 'molda-hound')).toBe(false);
    expect(at('aurochs-shield').scale).toBe(0.8);
    expect(at('eagle-cross').center.y).toBe(seedLayout.bounds.minY - 150);
    // the river sits on the horizon behind the figures, not in the soil
    expect(at('river-moldova').center.y).toBe(-30);
    expect(at('river-moldova').scale).toBeCloseTo((seedLayout.bounds.maxX - seedLayout.bounds.minX + 600) / 600);
  });

  it('places no crown ornaments any more: the hanging fruit fills the crown instead', () => {
    for (const layout of [seedLayout, bigTree(), layoutTree(buildHouseholds([]))]) {
      expect(placeMotifs(layout, 1).filter((m) => SCATTER_MOTIFS.includes(m.motif))).toHaveLength(0);
      expect(placeMotifs(layout, 1).map((m) => m.motif).sort()).toEqual([...FIXED_MOTIFS].sort());
    }
  });

  it('is deterministic per seed', () => expect(placeMotifs(bigTree(), 5)).toEqual(placeMotifs(bigTree(), 5)));
});
