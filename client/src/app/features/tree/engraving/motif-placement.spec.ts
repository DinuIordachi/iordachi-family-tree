import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { FIXED_MOTIFS, SCATTER_MOTIFS, placeMotifs } from './motif-placement';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';
import { MotifPlacement, TreeLayout } from './types';
import { BANNER_BOTTOM, BANNER_TOP } from './medallion-geometry';

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

  it('groups Ștefan and Molda together at the trunk, his hand within reach of her head', () => {
    const p = placeMotifs(seedLayout, 1);
    const at = (id: string) => p.find((m) => m.motif === id)!;
    const bx = seedLayout.trunk.base.x;
    const stefan = at('stefan-cel-mare');
    const molda = at('molda-hound');
    expect(stefan.center).toEqual({ x: bx - 250, y: -112 });
    expect(molda.center).toEqual({ x: bx - 126, y: -78 });
    expect(molda.mirrored).toBe(false);
    // both left of the trunk, Molda between him and the trunk
    expect(stefan.center.x).toBeLessThan(molda.center.x);
    expect(molda.center.x).toBeLessThan(bx);
    expect(at('aurochs-shield').scale).toBe(0.8);
    expect(at('eagle-cross').center.y).toBe(seedLayout.bounds.minY - 150);
    // the river sits on the horizon behind the figures, not in the soil
    expect(at('river-moldova').center.y).toBe(-30);
    expect(at('river-moldova').scale).toBeCloseTo((seedLayout.bounds.maxX - seedLayout.bounds.minX + 600) / 600);
  });

  it('scatters one ornament per 3 members, min 2', () =>
    expect(scattered(placeMotifs(seedLayout, 1))).toHaveLength(Math.max(2, Math.floor(seedLayout.members.length / 3))));

  it('fills a large crown with more ornaments, up to 16', () => {
    const n = scattered(placeMotifs(bigTree(), 1)).length;
    expect(n).toBeGreaterThan(8);
    expect(n).toBeLessThanOrEqual(16);
  });

  it('places no crown ornaments when the only person is a founder in the roots', () =>
    expect(scattered(placeMotifs(layoutTree(buildHouseholds([member('1')])), 1))).toHaveLength(0));

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
          // ornament box (80×80) vs banner box: x ± 85 (half a slot), y + BANNER_TOP … y + BANNER_BOTTOM
          const overlapX = Math.abs(o.center.x - m.center.x) < 40 + 85;
          const overlapY = o.center.y + 40 > m.center.y + BANNER_TOP && o.center.y - 40 < m.center.y + BANNER_BOTTOM;
          expect(overlapX && overlapY, `${o.motif} over banner of ${m.id}`).toBe(false);
        }
      }
    }
  });

  it('keeps ornaments in the crown, never down among the roots', () => {
    for (const layout of [seedLayout, bigTree()]) {
      for (let seed = 1; seed <= 6; seed++) {
        for (const o of scattered(placeMotifs(layout, seed))) {
          expect(o.center.y + 40, o.motif).toBeLessThanOrEqual(layout.trunk.base.y - 20);
        }
      }
    }
  });

  it('is deterministic per seed', () => expect(placeMotifs(bigTree(), 5)).toEqual(placeMotifs(bigTree(), 5)));
});
