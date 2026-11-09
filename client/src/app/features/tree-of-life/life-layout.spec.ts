import { member } from '../tree/engraving/testing/member-factory';
import { SEED_MEMBERS as seed } from '../tree/engraving/testing/seed-fixture';
import { GEOMETRY, MOTIFS, PALETTE, TINT, layoutLife, lineageOf } from './life-layout';
import { pathSegs } from './life-geometry';
import { motifHalf } from './ornament-scale';
import { ORNAMENT_ELEMENTS } from './ornament-elements';

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
    for (const m of l.motifs) expect(m.y).toBe(l.motifs.find((o) => o.gen === m.gen)!.y);
    const tiers = [...new Set(l.motifs.map((m) => m.gen))].sort().map((g) => l.motifs.find((m) => m.gen === g)!.y);
    for (let g = 1; g < tiers.length; g++) expect(tiers[g - 1] - tiers[g]).toBeGreaterThanOrEqual(GEOMETRY.tier);
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

  it('lets only one sibling carry the run up from the parents; the rest sprout from it', () => {
    const l = layoutLife(seed);
    const byParents = new Map<string, string[]>();
    for (const b of l.branches) byParents.set(b.parentIds.join('+'), [...(byParents.get(b.parentIds.join('+')) ?? []), b.d]);
    for (const [parents, ds] of byParents) {
      if (parents === '1+2') continue; // founders' branches all sprout from the stem
      expect(ds.filter((d) => /^M\S+ \S+ V/.test(d)).length).toBe(1);
    }
  });

  it("joins basil couples through each flower's open slot and mirrors the right one", () => {
    const l = layoutLife(joined);
    const bond = l.bonds.find((b) => b.memberIds.includes('10'))!; // founders 10+11 wear basil
    const [m10, m11] = ['10', '11'].map((id) => l.motifs.find((m) => m.id === id)!);
    const [left, right] = m10.x < m11.x ? [m10, m11] : [m11, m10];
    const k = GEOMETRY.basilLift;
    expect(bond.d).toBe(`M${left.x} ${left.y} L${left.x + k} ${left.y - k} H${right.x - k} L${right.x} ${right.y}`);
    expect(left.mirror).toBe(false);
    expect(right.mirror).toBe(true);
    // Their children leave from the raised bar, not from between the flowers.
    const fromBar = l.branches.filter((b) => b.parentIds.includes('10'));
    expect(fromBar.some((b) => b.d.startsWith(`M${(left.x + right.x) / 2} ${left.y - k} V`))).toBe(true);
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

  it('draws every element at line weight', () => {
    const l = layoutLife(seed);
    for (const m of l.motifs.filter((x) => !x.photo)) {
      expect(m.half).toEqual(motifHalf(m.motif));
      expect((2 * m.half.w) / ORNAMENT_ELEMENTS[m.motif].w).toBeCloseTo(GEOMETRY.stroke / 15.9, 5);
    }
  });

  it('keeps photo avatars as the exception, sizing joints and bars to the disc', () => {
    const withPhoto = joined.map((m) => (m.id === '3' || m.id === '20' ? { ...m, thumbnailUrl: `/p/${m.id}.jpg` } : m));
    const l = layoutLife(withPhoto);
    const m3 = l.motifs.find((m) => m.id === '3')!;
    const m20 = l.motifs.find((m) => m.id === '20')!;
    expect(m3.photo).toBe(true);
    expect(m3.half).toEqual({ w: GEOMETRY.avatar, h: GEOMETRY.avatar });
    expect(l.motifs.find((m) => m.id === '4')!.photo).toBe(false);
    // The branch into a photo ends just inside the disc's rim.
    const into20 = pathSegs(l.branches.find((b) => b.childId === '20')!.d).at(-1)!;
    expect(into20[1][1]).toBe(m20.y + GEOMETRY.avatar - GEOMETRY.joint);
    // The bar reaches just inside the disc on the photo's side.
    const bond = l.bonds.find((b) => b.memberIds.includes('3'))!;
    const end = m3.x < bond.x2 ? bond.x1 : bond.x2;
    expect(Math.abs(end - m3.x)).toBe(GEOMETRY.avatar - GEOMETRY.joint);
  });

  it('keeps parallel runs at least one lane apart (1.5 line widths of air)', () => {
    const l = layoutLife(joined);
    const runs = l.branches.flatMap((b) => pathSegs(b.d).filter(([a, c]) => a[1] === c[1] && a[0] !== c[0]));
    for (const [a1, b1] of runs)
      for (const [a2, b2] of runs) {
        if (a1[1] === a2[1]) continue;
        const overlap = Math.min(Math.max(a1[0], b1[0]), Math.max(a2[0], b2[0])) - Math.max(Math.min(a1[0], b1[0]), Math.min(a2[0], b2[0]));
        if (overlap > 0) expect(Math.abs(a1[1] - a2[1])).toBeGreaterThanOrEqual(GEOMETRY.lane);
      }
    expect(GEOMETRY.lane - GEOMETRY.stroke).toBeGreaterThanOrEqual(1.5 * GEOMETRY.stroke);
  });

  it('turns into a child on a full diagonal, never a short bevel', () => {
    const l = layoutLife(joined);
    for (const b of l.branches)
      for (const [a, c] of pathSegs(b.d)) {
        const dx = Math.abs(c[0] - a[0]);
        if (dx && Math.abs(c[1] - a[1]) === dx) expect(dx).toBeGreaterThanOrEqual(Math.min(GEOMETRY.diagonal, 1e9));
      }
  });

  it('puts the labels of single parents beside them, clear of the branch leaving their top', () => {
    const l = layoutLife(seed);
    for (const m of l.motifs) {
      const leaves = l.branches.some((b) => b.parentIds.length === 1 && b.parentIds[0] === m.id);
      const couple = l.bonds.some((b) => b.memberIds.includes(m.id));
      if (leaves && !couple) expect(m.label).not.toBe('above');
      if (couple) expect(m.label).toBe('above');
    }
  });

  it('has a tint for every line colour', () => {
    for (const [name, c] of Object.entries(PALETTE)) if (name !== 'black') expect(TINT[c]).toBeDefined();
  });

  it('grows chevrons on the stem with arms at 45°, forest left and green right', () => {
    const l = layoutLife(seed);
    expect(l.leaves.length).toBeGreaterThan(0);
    for (const leaf of l.leaves) {
      const arms = leaf.lines.filter((x) => x.d.startsWith(`M0 ${leaf.y} `));
      expect(arms.length).toBe(2);
      for (const arm of arms) {
        const [[a, c]] = pathSegs(arm.d);
        expect(Math.abs(c[0] - a[0])).toBe(GEOMETRY.leafArm);
        expect(a[1] - c[1]).toBe(GEOMETRY.leafArm);
        expect(arm.color).toBe(c[0] < 0 ? PALETTE.forest : PALETTE.green);
      }
    }
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
