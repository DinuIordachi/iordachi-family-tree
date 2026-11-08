import { engravedBranch, engravedTrunk, rootSystem, soilHatching } from './wood';
import { BranchSegment } from './types';

const trunk = { base: { x: 0, y: 0 }, top: { x: 0, y: -220 } };
const seg: BranchSegment = {
  id: '1+2>3+4',
  parentHouseholdId: '1+2',
  childHouseholdId: '3+4',
  from: { x: 0, y: -220 },
  to: { x: 200, y: -410 },
  generation: 1,
};
const anchors = (d: string) => [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

describe('engravedTrunk', () => {
  const t = engravedTrunk(trunk, 3);
  it('is a closed body with bark grooves, side shading and knots', () => {
    expect(t.body).toMatch(/^M.*Z$/);
    expect(anchors(t.grooves).length).toBeGreaterThan(30);
    expect(anchors(t.shading).length).toBeGreaterThan(40);
    expect(t.knots).toMatch(/^M/);
  });
  it('flares at the base and narrows to the first branch width at the top', () => {
    const pts = [...t.body.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    const xsAt = (y0: number) => {
      const xs = pts.filter((p) => Math.abs(p.y - y0) < 6).map((p) => p.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(xsAt(0)).toBeGreaterThan(80);
    expect(xsAt(-220)).toBeLessThanOrEqual(34);
  });
  it('is deterministic and NaN-free', () => {
    expect(engravedTrunk(trunk, 3)).toEqual(t);
    expect(JSON.stringify(t)).not.toContain('NaN');
  });
});

describe('engravedBranch', () => {
  const b = engravedBranch(seg);
  it('keeps the tapered body ending at the given fork width', () => {
    expect(engravedBranch(seg, 20).body).toContain('A10 10 ');
    expect(b.body).toMatch(/^M.*Z$/);
  });
  it('has bark grooves, shading and side twigs reaching into the foliage', () => {
    expect(b.grooves.length).toBeGreaterThan(0);
    expect(b.shading.length).toBeGreaterThan(0);
    expect(anchors(b.twigs).length).toBeGreaterThanOrEqual(2);
  });
  it('survives a zero-length segment', () => {
    const z = engravedBranch({ ...seg, to: seg.from });
    expect(JSON.stringify(z)).not.toContain('NaN');
  });
  it('is deterministic per branch id', () => expect(engravedBranch(seg)).toEqual(b));
});

describe('rootSystem and soil', () => {
  const opts = { spreadX: 320, depth: 230 };
  const r = rootSystem({ x: 0, y: 0 }, opts, 9);
  it('spreads many branching roots, staying inside the soil cutaway', () => {
    const all = [...anchors(r.bodies), ...anchors(r.fine)];
    expect(all.length).toBeGreaterThan(25);
    for (const p of all) {
      expect((p.x / opts.spreadX) ** 2 + (Math.max(0, p.y) / opts.depth) ** 2).toBeLessThanOrEqual(1.05);
      expect(p.y).toBeGreaterThan(-12);
    }
  });
  it('engraves soil as horizontal lines below the ground only', () => {
    const s = soilHatching({ x: 0, y: 0 }, opts, 9);
    const pts = anchors(s);
    expect(pts.length).toBeGreaterThan(40);
    for (const p of pts) expect(p.y).toBeGreaterThan(0);
  });
  it('is deterministic and NaN-free', () => {
    expect(rootSystem({ x: 0, y: 0 }, opts, 9)).toEqual(r);
    expect(JSON.stringify(r)).not.toContain('NaN');
  });
});
