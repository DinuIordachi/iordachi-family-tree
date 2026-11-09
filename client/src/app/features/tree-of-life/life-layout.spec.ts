import { member } from '../tree/engraving/testing/member-factory';
import { SEED_MEMBERS as seed } from '../tree/engraving/testing/seed-fixture';
import { GEOMETRY, MOTIFS, PALETTE, layoutLife, lineageOf } from './life-layout';

/** Two founding couples joined when 3 marries 12 (12's family is an in-law line). */
const joined = [
  member('1', { spouses: ['2'], children: ['3', '4'] }),
  member('2', { spouses: ['1'], children: ['3', '4'] }),
  member('3', { parents: ['1', '2'], spouses: ['12'], children: ['20'] }),
  member('4', { parents: ['1', '2'] }),
  member('10', { spouses: ['11'], children: ['12', '13'] }),
  member('11', { spouses: ['10'], children: ['12', '13'] }),
  member('12', { parents: ['10', '11'], spouses: ['3'], children: ['20'] }),
  member('13', { parents: ['10', '11'] }),
  member('20', { parents: ['3', '12'] }),
];

describe('layoutLife', () => {
  it('returns an empty layout for no members', () => {
    const l = layoutLife([]);
    expect(l.motifs).toEqual([]);
    expect(l.generations).toBe(0);
  });

  it('places every member once, one generation per tier, oldest at the roots', () => {
    const l = layoutLife(seed);
    expect(l.motifs.map((m) => m.id).sort()).toEqual(seed.map((m) => m.id).sort());
    const y = (id: string) => l.motifs.find((m) => m.id === id)!.y;
    expect(y('1')).toBe(0);
    expect(y('3')).toBe(-GEOMETRY.tier);
    expect(y('8')).toBe(-3 * GEOMETRY.tier);
    expect(l.generations).toBe(4);
  });

  it('keeps the founders on the stem and the stem clear above them', () => {
    const l = layoutLife(seed);
    const founders = l.motifs.filter((m) => m.gen === 0);
    expect(founders.reduce((s, m) => s + m.x, 0)).toBe(0);
    for (const m of l.motifs.filter((x) => x.gen > 0)) {
      expect(Math.abs(m.x)).toBeGreaterThanOrEqual(GEOMETRY.trunkClear);
    }
    expect(l.rose.y).toBeLessThan(Math.min(...l.motifs.map((m) => m.y)));
  });

  it('assigns one folk element per generation', () => {
    const l = layoutLife(seed);
    for (const m of l.motifs) expect(m.motif).toBe(MOTIFS[m.gen]);
  });

  it('draws one branch per child, built from vertical, 45° and horizontal runs only', () => {
    const l = layoutLife(seed);
    const children = seed.filter((m) => m.rels.parents.length);
    expect(l.branches.map((b) => b.childId).sort()).toEqual(children.map((m) => m.id).sort());
    for (const b of l.branches) {
      const pts: number[][] = [];
      for (const [, cmd, a, b2] of b.d.matchAll(/([MLHV])(-?[\d.]+)(?: (-?[\d.]+))?/g)) {
        const last = pts[pts.length - 1];
        if (cmd === 'H') pts.push([+a, last[1]]);
        else if (cmd === 'V') pts.push([last[0], +a]);
        else pts.push([+a, +b2]);
      }
      for (let i = 1; i < pts.length; i++) {
        const dx = Math.abs(pts[i][0] - pts[i - 1][0]);
        const dy = Math.abs(pts[i][1] - pts[i - 1][1]);
        expect(dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6).toBe(true);
      }
    }
  });

  it('hangs an in-law family on the outer side of the member who married in', () => {
    const l = layoutLife(joined);
    const x = (id: string) => l.motifs.find((m) => m.id === id)!.x;
    const side = Math.sign(x('3'));
    expect(Math.sign(x('10'))).toBe(side);
    expect(Math.abs(x('10'))).toBeGreaterThan(Math.abs(x('3')));
    expect(Math.abs(x('12'))).toBeGreaterThan(Math.abs(x('3')));
  });

  it('colours a married-in member and the branch from their parents with their own family line', () => {
    const l = layoutLife(joined);
    expect(l.motifs.find((m) => m.id === '12')!.color).toBe(PALETTE.forest);
    expect(l.branches.find((b) => b.childId === '12')!.color).toBe(PALETTE.forest);
  });

  it('places unconnected people without throwing', () => {
    const l = layoutLife([...seed, member('99')]);
    expect(l.motifs.some((m) => m.id === '99')).toBe(true);
  });
});

describe('lineageOf', () => {
  it('collects ancestors, descendants and spouses', () => {
    expect([...lineageOf('5', seed)].sort()).toEqual(['1', '2', '3', '4', '5', '6', '8', '9']);
  });

  it('does not light siblings', () => {
    expect(lineageOf('5', seed).has('7')).toBe(false);
  });
});
