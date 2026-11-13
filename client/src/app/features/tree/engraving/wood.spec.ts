import {
  HANG_ABOVE,
  branchCentreline,
  decorativeSpurs,
  engravedBranch,
  engravedTrunk,
  hangPoint,
  hangers,
  limbHalfWidths,
  rootCentreline,
  rootSystem,
  soilHatching,
} from './wood';
import { BranchSegment, TreeLayout } from './types';
import { woodWidth } from './branch-geometry';
import { CLEAR_RISE, MEDALLION_RX, MEDALLION_RY } from './medallion-geometry';

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
    expect(xsAt(-220)).toBeLessThanOrEqual(woodWidth(1) * 1.3 + 1); // a little wider than its first limb
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
  it('has bark grooves and shading, and leaves its twigs to the recursively grown crown wood', () => {
    expect(b.grooves.length).toBeGreaterThan(0);
    expect(b.shading.length).toBeGreaterThan(0);
    expect(b.twigs).toBe('');
  });
  it('joins the trunk with a curved web, flaring where it leaves, kept apart from the limb outline', () => {
    expect(b.body.match(/Z/g)).toHaveLength(1);
    expect(b.web).toMatch(/^M.*Q.*Z$/);
  });
  it('needs no web where it carries the trunk straight on', () => {
    expect(engravedBranch({ ...seg, to: { x: seg.from.x, y: seg.from.y - 300 } }).web).toBe('');
  });
  it('tapers from base to tip', () => {
    for (let i = 1; i < b.half.length; i++) expect(b.half[i]).toBeLessThanOrEqual(b.half[i - 1] + 1e-9);
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
  it('flares into a collar where the limb leaves the trunk', () => {
    expect(h[0]).toBeGreaterThan(h[4] * 1.25);
  });
  it('carries on past a fork without a collar, thinning smoothly', () => {
    const on = limbHalfWidths(20, 4, 24, false);
    expect(on[0]).toBeCloseTo(10);
    for (let i = 1; i < on.length; i++) {
      expect(on[i - 1] - on[i]).toBeLessThan(1.2); // no sudden step anywhere
    }
  });
  it('tapers all the way, ending at half the tip width', () => {
    for (let i = 1; i < h.length; i++) {
      expect(h[i]).toBeLessThanOrEqual(h[i - 1] + 1e-9);
    }
    expect(h[h.length - 1]).toBeCloseTo(2);
  });
  it('thins a little faster near its start than near its tip, but evenly, without a waist', () => {
    const on = limbHalfWidths(20, 4, 24, false);
    expect(on[12]).toBeLessThan((on[0] + on[24]) / 2);
    expect(on[12]).toBeGreaterThan((on[0] + on[24]) / 2 - 1.5);
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
  // a limb leaving the trunk for a household far out to the side and a little higher
  const wide: BranchSegment = { ...seg, id: 'wide', from: { x: 0, y: -220 }, to: { x: 800, y: -440 } };
  const pts = branchCentreline(wide);
  const tip = hangPoint(wide.to);
  const headings = pts.slice(1).map((p, i) => Math.atan2(p.y - pts[i].y, p.x - pts[i].x));
  const degreesUp = (h: number) => (Math.atan2(-Math.sin(h), Math.abs(Math.cos(h))) * 180) / Math.PI;

  it('leaves the trunk where it forks and ends at the twig point its household hangs from', () => {
    expect(pts[0]).toEqual(wide.from);
    expect(pts[pts.length - 1].x).toBeCloseTo(tip.x, 1);
    expect(pts[pts.length - 1].y).toBeCloseTo(tip.y, 1);
    expect(tip.x).toBe(wide.to.x);
    expect(tip.y).toBe(wide.to.y - HANG_ABOVE);
  });

  it('leaves the trunk climbing at 30–60°, even when its household is far to the side', () => {
    const first = degreesUp(Math.atan2(pts[3].y - pts[0].y, pts[3].x - pts[0].x));
    expect(first).toBeGreaterThanOrEqual(25);
    expect(first).toBeLessThanOrEqual(62);
  });

  it('bends upward toward the light: it arrives steeper than it set out', () => {
    expect(degreesUp(headings[headings.length - 1])).toBeGreaterThan(degreesUp(Math.atan2(tip.y - wide.from.y, tip.x - wide.from.x)));
  });

  it('is one smooth curve: no corners and no straight drop', () => {
    for (let i = 1; i < headings.length; i++) {
      const turn = Math.abs(Math.atan2(Math.sin(headings[i] - headings[i - 1]), Math.cos(headings[i] - headings[i - 1])));
      expect(turn).toBeLessThan(0.35); // under 20° between neighbouring samples
    }
    expect(pts.every((p, i) => i === 0 || p.x >= pts[i - 1].x - 1e-6)).toBe(true); // never doubles back
  });

  it('stays above its own portrait and banner: they hang below the twig', () => {
    for (const p of pts.filter((q) => Math.abs(q.x - wide.to.x) < MEDALLION_RX + 10)) {
      expect(p.y).toBeLessThan(wide.to.y - MEDALLION_RY);
    }
  });

  it('carries on from the twig its parents hang from, when it grows out of a household', () => {
    const child: BranchSegment = { ...seg, id: '4+17>28', from: { x: 0, y: -400 }, to: { x: -300, y: -680 }, rise: CLEAR_RISE };
    const c = branchCentreline(child);
    expect(c[0]).toEqual(hangPoint(child.from));
    expect(c[c.length - 1].x).toBeCloseTo(-300, 1);
    expect(c[c.length - 1].y).toBeCloseTo(-680 - HANG_ABOVE, 1);
  });

  it('keeps an upright branch upright', () => {
    const up: BranchSegment = { ...seg, id: 'up', from: { x: 0, y: -220 }, to: { x: 10, y: -610 } };
    const xs = branchCentreline(up).map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(40);
  });

  it('survives a zero-length branch', () => {
    expect(JSON.stringify(branchCentreline({ ...seg, to: { x: seg.from.x, y: seg.from.y + HANG_ABOVE } }))).not.toContain('NaN');
  });
});

describe('hangers', () => {
  const layout = {
    members: [
      { id: '1', householdId: '1+2', generation: 0, center: { x: -100, y: 120 } },
      { id: '2', householdId: '1+2', generation: 0, center: { x: 100, y: 120 } },
      { id: '3', householdId: '3+4', generation: 1, center: { x: -140, y: -600 } },
      { id: '4', householdId: '3+4', generation: 1, center: { x: 140, y: -600 } },
      { id: '7', householdId: '7', generation: 1, center: { x: 600, y: -500 } },
    ],
    trunk: { base: { x: 0, y: 0 }, top: { x: 0, y: -400 } },
  } as unknown as TreeLayout;
  const d = hangers(layout);

  it('hangs each portrait above ground from a stem; a couple from a fork with one tip each', () => {
    expect(anchors(d)).toHaveLength(3); // 3 and 4 on the couple's fork, 7 on its own stem; founders sit in the roots
  });

  it('starts every stem at the twig point (within its half-width)', () => {
    const near = (p: { x: number; y: number }) => anchors(d).filter((q) => Math.hypot(q.x - p.x, q.y - p.y) <= 6);
    expect(near(hangPoint({ x: 0, y: -600 }))).toHaveLength(2);
    expect(near(hangPoint({ x: 600, y: -500 }))).toHaveLength(1);
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

describe('decorativeSpurs', () => {
  // a trunk with two limbs and three households in the crown
  const layout = {
    members: [
      { id: '3', householdId: '3', generation: 1, center: { x: 0, y: -900 } },
      { id: '4', householdId: '4', generation: 2, center: { x: -700, y: -1100 } },
      { id: '5', householdId: '5', generation: 2, center: { x: 700, y: -1150 } },
    ],
    branches: [
      { id: '3>4', parentHouseholdId: '3', childHouseholdId: '4', from: { x: 0, y: -500 }, to: { x: -700, y: -1100 }, generation: 2, weight: 2 },
      { id: '3>5', parentHouseholdId: '3', childHouseholdId: '5', from: { x: 0, y: -450 }, to: { x: 700, y: -1150 }, generation: 2, weight: 2 },
    ],
    trunk: { base: { x: 0, y: 0 }, top: { x: 0, y: -760 } },
  } as unknown as TreeLayout;
  const s = decorativeSpurs(layout, 11, 280);

  it('grows side branches into the crown, each ending in a tip for a leaf tuft', () => {
    expect(s.tips.length).toBeGreaterThan(3);
    expect(anchors(s.body)).toHaveLength(s.tips.length);
    expect(s.bark.length).toBeGreaterThan(0);
  });

  it('only climbs: every tip is above where the wood it grows from is lowest', () => {
    for (const t of s.tips) expect(t.y).toBeLessThan(layout.trunk.base.y - 100);
  });

  it('never runs across a portrait or its banner', () => {
    const pts = [...s.body.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    for (const m of layout.members) {
      const inside = pts.filter((p) => Math.abs(p.x - m.center.x) < 140 && p.y > m.center.y - 100 && p.y < m.center.y + 150);
      expect(inside, m.id).toEqual([]);
    }
  });

  it('is deterministic', () => expect(decorativeSpurs(layout, 11, 280)).toEqual(s));
});
