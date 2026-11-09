import { branchCentreline, engravedBranch, engravedTrunk, limbHalfWidths, rootCentreline, rootSystem, soilHatching } from './wood';
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
    expect(xsAt(-220)).toBeLessThanOrEqual(40);
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
  it('starts its bark only once it has left the parent wood, so it grows out of it rather than through it', () => {
    const from = seg.from;
    const nearest = Math.min(...anchors(b.grooves).map((p) => Math.hypot(p.x - from.x, p.y - from.y)));
    expect(nearest).toBeGreaterThan(20);
  });
  it('survives a zero-length segment', () => {
    const z = engravedBranch({ ...seg, to: seg.from });
    expect(JSON.stringify(z)).not.toContain('NaN');
  });
  it('is deterministic per branch id', () => expect(engravedBranch(seg)).toEqual(b));
});

describe('limbHalfWidths', () => {
  const h = limbHalfWidths(20, 4, 24);
  it('flares into a collar where the limb leaves its parent', () => {
    expect(h[0]).toBeGreaterThan(h[4] * 1.25);
  });
  it('tapers all the way, ending at half the tip width', () => {
    for (let i = 1; i < h.length; i++) {
      expect(h[i]).toBeLessThanOrEqual(h[i - 1] + 1e-9);
    }
    expect(h[h.length - 1]).toBeCloseTo(2);
  });
  it('loses most of its thickness early, like real wood, not linearly', () => {
    expect(h[12]).toBeLessThan((h[4] + h[h.length - 1]) / 2 + 1);
  });
});

describe('engravedBranch — root to the founders', () => {
  const root = engravedBranch({ ...seg, id: 'trunk>1+2', parentHouseholdId: null, from: { x: 0, y: 0 }, to: { x: 0, y: 135 }, generation: 0 });
  it('leaves the trunk base about as wide as the trunk itself, with no twigs', () => {
    const pts = [...root.body.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    const near = pts.filter((p) => p.y < 4).map((p) => p.x);
    expect(Math.max(...near) - Math.min(...near)).toBeGreaterThan(60);
    expect(root.twigs).toBe('');
  });
});

describe('rootCentreline', () => {
  const pts = rootCentreline({ ...seg, id: 'trunk>1+2', parentHouseholdId: null, from: { x: 0, y: 0 }, to: { x: 60, y: 135 } });
  it('runs from just inside the trunk base down to the founders without ever climbing', () => {
    expect(pts[0].x).toBe(0);
    expect(pts[0].y).toBeLessThan(0); // tucked under the trunk, so its start never shows as a seam
    expect(pts[0].y).toBeGreaterThan(-20);
    expect(pts[pts.length - 1].x).toBeCloseTo(60);
    expect(pts[pts.length - 1].y).toBeCloseTo(135);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].y).toBeGreaterThanOrEqual(pts[i - 1].y - 1e-9);
    }
  });
});

describe('branchCentreline', () => {
  const wide: BranchSegment = { ...seg, id: 'wide', from: { x: 0, y: -220 }, to: { x: 800, y: -340 } };
  const pts = branchCentreline(wide);
  const headings = pts.slice(1).map((p, i) => Math.atan2(p.y - pts[i].y, p.x - pts[i].x));
  const turns = headings.slice(1).map((h, i) => Math.sign(Math.atan2(Math.sin(h - headings[i]), Math.cos(h - headings[i]))));

  it('starts at the fork and ends exactly on the person', () => {
    expect(pts[0]).toEqual(wide.from);
    expect(pts[pts.length - 1].x).toBeCloseTo(800, 1);
    expect(pts[pts.length - 1].y).toBeCloseTo(-340, 1);
  });

  it('leaves the fork climbing, like a limb, even when the person is far to the side', () => {
    const first = { x: pts[3].x - pts[0].x, y: pts[3].y - pts[0].y };
    expect(first.y).toBeLessThan(0);
    expect(Math.abs(first.y)).toBeGreaterThan(Math.abs(first.x) * 0.5);
  });

  it('bends this way and that like a real limb, not one smooth arc', () => {
    const changes = turns.slice(1).filter((t, i) => t !== 0 && turns[i] !== 0 && t !== turns[i]).length;
    expect(changes).toBeGreaterThanOrEqual(2);
  });

  it('comes up into its person from below, so it never runs across the portrait or the name banner', () => {
    // a banner hangs 44…94 below the portrait centre and is at most ~85 wide on each side
    // so inside that band, the limb may only be in the narrow column straight under the portrait
    const acrossPortraitOrBanner = pts.filter(
      (p) => p.y > wide.to.y - 50 && p.y < wide.to.y + 100 && Math.abs(p.x - wide.to.x) > 34 && Math.abs(p.x - wide.to.x) < 90,
    );
    expect(acrossPortraitOrBanner).toEqual([]);
    const last = pts.slice(-4);
    expect(Math.abs(last[3].x - last[0].x)).toBeLessThan(Math.abs(last[3].y - last[0].y));
  });

  it('rises clear of its parents\' portraits before spreading, when it grows out of a household', () => {
    const child: BranchSegment = { ...seg, id: '4+17>28', from: { x: 0, y: -400 }, to: { x: -85, y: -590 }, rise: 55 };
    const c = branchCentreline(child);
    for (const p of c.filter((q) => q.y > -400 - 50)) {
      expect(Math.abs(p.x)).toBeLessThan(12);
    }
    expect(c[c.length - 1].x).toBeCloseTo(-85, 1);
    expect(c[c.length - 1].y).toBeCloseTo(-590, 1);
  });

  it('keeps an upright branch upright', () => {
    const up: BranchSegment = { ...seg, id: 'up', from: { x: 0, y: -220 }, to: { x: 10, y: -410 } };
    const xs = branchCentreline(up).map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(40);
  });

  it('survives a zero-length branch', () => {
    expect(JSON.stringify(branchCentreline({ ...seg, to: seg.from }))).not.toContain('NaN');
  });
});

describe('rootSystem and soil', () => {
  const opts = { spreadX: 320, depth: 230 };
  const r = rootSystem({ x: 0, y: 0 }, opts, 9);
  it('spreads many branching roots, staying inside the soil cutaway', () => {
    const all = [...anchors(r.bodies), ...anchors(r.fine)];
    expect(all.length).toBeGreaterThan(25);
    for (const p of all) {
      expect((p.x / opts.spreadX) ** 2 + (Math.max(0, p.y) / opts.depth) ** 2).toBeLessThanOrEqual(1.05);
      expect(p.y).toBeGreaterThan(-30); // main roots start tucked a little inside the trunk base
    }
  });
  it('starts its main roots inside the trunk base, so they grow out of it without a seam at the ground', () => {
    const starts = [...r.bodies.matchAll(/(?:^|Z)M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));
    expect(starts.some((y) => y < -4)).toBe(true);
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
