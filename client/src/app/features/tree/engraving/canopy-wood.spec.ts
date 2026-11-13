import { growCrownWood, jointWeb, LimbWood } from './canopy-wood';
import { Point } from './types';

/** A limb leaving a trunk at x = 0, running up and out to the right. */
const limb: LimbWood = {
  centre: Array.from({ length: 25 }, (_, i) => ({ x: i * 16, y: -i * 14 })),
  half: Array.from({ length: 25 }, (_, i) => 14 - i * 0.4),
};
const anchors = (d: string): Point[] => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
const inCrown = (p: Point) => Math.hypot(p.x - 200, p.y + 200) < 340;

describe('growCrownWood', () => {
  const wood = growCrownWood([limb], { seed: 7, allowed: inCrown });

  it('grows branches and fine twigs out of the limb', () => {
    expect(wood.body.length).toBeGreaterThan(0);
    expect(wood.twigs.length).toBeGreaterThan(0);
    // many forks: fine twigs out at the edge outnumber the thicker branches they hang from
    expect(wood.twigs.match(/Z/g)!.length).toBeGreaterThan(10);
  });

  it('keeps every branch inside where wood may grow', () => {
    // outline points may sit up to a branch's half-width (and its web) beside the centreline
    for (const p of anchors(wood.body + wood.twigs)) expect(Math.hypot(p.x - 200, p.y + 200)).toBeLessThan(340 + 12);
  });

  it('never grows into a kept-out area (a portrait)', () => {
    const portrait = (p: Point) => Math.hypot(p.x - 260, p.y + 330) < 60;
    const w = growCrownWood([limb], { seed: 7, allowed: (p) => inCrown(p) && !portrait(p) });
    // outline points may sit up to a branch's half-width beside its centreline
    for (const p of anchors(w.body + w.twigs)) expect(Math.hypot(p.x - 260, p.y + 330)).toBeGreaterThan(50);
  });

  it('is the same on every load', () => expect(growCrownWood([limb], { seed: 7, allowed: inCrown })).toEqual(wood));
  it('is NaN-free', () => expect(JSON.stringify(wood)).not.toContain('NaN'));
});

describe('jointWeb', () => {
  it('sweeps from the parent line into the branch edges with curves', () => {
    const d = jointWeb(limb.centre, limb.half, { x: 0, y: -1 });
    expect(d).toMatch(/^M.*Q.*L.*Q.*Z$/);
  });
  it('winds the same way as the branch outline, so overlapping fills never cut a hole', () => {
    const area = (d: string) => {
      const p = anchors(d.replace(/Q(-?[\d.]+) (-?[\d.]+) /g, 'L'));
      return p.reduce((s, a, i) => s + a.x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * a.y, 0);
    };
    const left = limb.centre.map((c, i) => ({ x: c.x, y: c.y + limb.half[i] }));
    for (const dir of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }]) {
      const web = jointWeb(limb.centre, limb.half, dir);
      const ribbon = `M${left[0].x} ${left[0].y}L${left[3].x} ${left[3].y}L${limb.centre[3].x} ${limb.centre[3].y - limb.half[3]}L${limb.centre[0].x} ${limb.centre[0].y - limb.half[0]}Z`;
      expect(Math.sign(area(web))).toBe(Math.sign(area(ribbon)));
    }
  });
  it('is empty for a hairline branch', () => expect(jointWeb(limb.centre, limb.half.map(() => 0.2), { x: 0, y: -1 })).toBe(''));
});
