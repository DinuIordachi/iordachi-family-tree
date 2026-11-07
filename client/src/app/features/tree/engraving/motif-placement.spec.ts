import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { FIXED_MOTIFS, SCATTER_MOTIFS, placeMotifs } from './motif-placement';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';
import { MotifPlacement, TreeLayout } from './types';

const scattered = (p: MotifPlacement[]) => p.filter((m) => SCATTER_MOTIFS.includes(m.motif));

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

  it('puts Ștefan left and the hound right of the trunk, the eagle above the crown', () => {
    const p = placeMotifs(seedLayout, 1);
    const at = (id: string) => p.find((m) => m.motif === id)!;
    expect(at('stefan-cel-mare').center).toEqual({ x: seedLayout.trunk.base.x - 230, y: -70 });
    expect(at('molda-hound').center).toEqual({ x: seedLayout.trunk.base.x + 230, y: -30 });
    expect(at('molda-hound').mirrored).toBe(true);
    expect(at('aurochs-shield').scale).toBe(0.8);
    expect(at('eagle-cross').center.y).toBe(seedLayout.bounds.minY - 130);
    expect(at('river-moldova').scale).toBeCloseTo((seedLayout.bounds.maxX - seedLayout.bounds.minX + 600) / 600);
  });

  it('scatters one ornament per 4 members, min 2', () => expect(scattered(placeMotifs(seedLayout, 1))).toHaveLength(2));

  it('caps scattered ornaments at 8', () => expect(scattered(placeMotifs(bigTree(), 1))).toHaveLength(8));

  it('flanks a lone founder with the minimum two ornaments', () =>
    expect(scattered(placeMotifs(layoutTree(buildHouseholds([member('1')])), 1))).toHaveLength(2));

  it('places none when there are no members at all', () =>
    expect(scattered(placeMotifs(layoutTree(buildHouseholds([])), 1))).toHaveLength(0));

  it('keeps 90 units from medallions and other ornaments', () => {
    const layout = bigTree();
    const s = scattered(placeMotifs(layout, 3));
    for (const o of s) {
      for (const m of layout.members) {
        expect(Math.hypot(o.center.x - m.center.x, o.center.y - m.center.y)).toBeGreaterThanOrEqual(90);
      }
      for (const other of s) {
        if (other !== o) {
          expect(Math.hypot(o.center.x - other.center.x, o.center.y - other.center.y)).toBeGreaterThanOrEqual(90);
        }
      }
    }
  });

  it('keeps ornaments off every name banner and its years', () => {
    for (const layout of [seedLayout, bigTree()]) {
      const s = scattered(placeMotifs(layout, 3));
      for (const o of s) {
        for (const m of layout.members) {
          // ornament box (80×80) vs banner box: x ± 85 (half the 170 slot), y + 44 … y + 94
          const overlapX = Math.abs(o.center.x - m.center.x) < 40 + 85;
          const overlapY = o.center.y + 40 > m.center.y + 44 && o.center.y - 40 < m.center.y + 94;
          expect(overlapX && overlapY, `${o.motif} over banner of ${m.id}`).toBe(false);
        }
      }
    }
  });

  it('is deterministic per seed', () => expect(placeMotifs(bigTree(), 5)).toEqual(placeMotifs(bigTree(), 5)));
});
