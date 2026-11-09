import { SEED_MEMBERS as seed } from '../tree/engraving/testing/seed-fixture';
import { member } from '../tree/engraving/testing/member-factory';
import { ANCHOR, CONNECTOR, DECOR, DECOR_KINDS, TIP_KINDS, decorate, isTip, pathPoints } from './life-decorations';
import { GEOMETRY, layoutLife } from './life-layout';
import { motifScale } from './ornament-scale';

/** A wider family so there is free crown to decorate. */
const family = [
  member('1', { spouses: ['2'], children: ['3', '4', '5', '6'] }),
  member('2', { spouses: ['1'], children: ['3', '4', '5', '6'] }),
  ...['3', '4', '5', '6'].map((id) =>
    member(id, { parents: ['1', '2'], children: [`${id}0`, `${id}1`] }),
  ),
  ...['3', '4', '5', '6'].flatMap((p) => [member(`${p}0`, { parents: [p] }), member(`${p}1`, { parents: [p] })]),
];

describe('decorate', () => {
  const layout = layoutLife(family);
  const decor = decorate(layout);

  it('is empty for an empty tree', () => expect(decorate(layoutLife([]))).toEqual([]));

  it('scatters some elements from the symbol', () => {
    expect(decor.length).toBeGreaterThan(0);
    for (const d of decor) expect(DECOR_KINDS).toContain(d.kind);
  });

  it('is stable for the same family', () => expect(decorate(layoutLife(family))).toEqual(decor));

  it('grows each sprig at 45° and keeps elements apart', () => {
    for (const d of decor) {
      const [[ax, ay], [bx, by]] = pathPoints(d.stub);
      expect(Math.abs(bx - ax)).toBeCloseTo(Math.abs(by - ay));
      for (const o of decor) {
        if (o !== d) expect(Math.hypot(o.x - d.x, o.y - d.y)).toBeGreaterThanOrEqual(DECOR.spacing);
      }
    }
  });

  it('joins each element the way the ornament does', () => {
    for (const d of decor) {
      if (isTip(d.kind)) continue;
      const pts = pathPoints(d.stub);
      const [qx, qy] = pts[1];
      if (CONNECTOR[d.kind] === 'diagonal') {
        expect(pts.length).toBe(2);
        continue;
      }
      if (CONNECTOR[d.kind] === 'slot') {
        // Basil: the diagonal runs on into the flower's heart...
        expect(pts.length).toBe(2);
        expect(pts[1]).toEqual([d.x, d.y]);
        // ...and the flower is turned so its open slot (up-right in the
        // original) faces back along the sprig.
        const [px, py] = pts[0];
        expect(-d.facing).toBe(Math.sign(px - d.x));
        expect(-d.flip).toBe(Math.sign(py - d.y));
        continue;
      }
      expect(pts.length).toBe(3);
      const [ex, ey] = pts[2];
      if (CONNECTOR[d.kind] === 'horizontal') {
        expect(ey).toBe(qy);
        expect(Math.sign(d.x - ex)).toBe(Math.sign(ex - qx)); // element continues the run
        const anchor = ANCHOR[d.kind];
        if (anchor) {
          // The run ends on the element's joining point, as drawn (mirrored to face the sprig).
          const k = motifScale(d.kind);
          expect(d.x - d.facing * anchor[0] * k).toBeCloseTo(ex);
          expect(d.y + anchor[1] * k).toBeCloseTo(ey);
        } else {
          expect(d.y).toBe(ey);
        }
      } else {
        expect(ex).toBe(qx);
        expect(ey).toBeLessThan(qy); // upright: the stalk rises
        expect(d.x).toBe(ex);
        expect(d.y).toBeLessThan(ey);
      }
    }
  });

  it('keeps every element clear of all lines, its own host branch included', () => {
    const segs = layout.branches.flatMap((b) => {
      const pts = pathPoints(b.d);
      return pts.slice(1).map((pt, i) => ({ a: pts[i], b: pt, color: b.color }));
    });
    const dist = ([px, py]: number[], [ax, ay]: number[], [bx, by]: number[]) => {
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    for (const d of decor) {
      for (const sg of segs) expect(dist([d.x, d.y], sg.a, sg.b)).toBeGreaterThanOrEqual(DECOR.branchClear);
      const start = pathPoints(d.stub)[0];
      const host = segs.find((sg) => dist(start, sg.a, sg.b) < 0.5);
      if (host) {
        expect(d.color).not.toBe(host.color);
        expect(d.stubColor).not.toBe(host.color);
      }
    }
  });

  it('draws the ornament\'s line endings at line weight, square to the 45° grid', () => {
    const tips = decor.filter((d) => isTip(d.kind));
    expect(tips.length).toBeGreaterThan(0);
    const parts = { comb: 4, cross: 2 } as const;
    for (const d of tips) {
      const subpaths = d.stub.split('M').filter(Boolean).map((sp) => pathPoints('M' + sp));
      expect(subpaths.length).toBe(parts[d.kind as (typeof TIP_KINDS)[number]]);
      for (const pts of subpaths)
        for (let i = 1; i < pts.length; i++) {
          const dx = Math.abs(pts[i][0] - pts[i - 1][0]);
          const dy = Math.abs(pts[i][1] - pts[i - 1][1]);
          expect(dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6).toBe(true);
        }
    }
  });

  it('keeps clear of members and their names', () => {
    for (const d of decor) {
      for (const m of layout.motifs) {
        const hw = Math.max(m.half.w, m.label === 'above' ? GEOMETRY.labelWidth / 2 : 0);
        const x1 = m.x - hw - (m.label === 'left' ? GEOMETRY.sideLabel : 0);
        const x2 = m.x + hw + (m.label === 'right' ? GEOMETRY.sideLabel : 0);
        const inside = d.x > x1 && d.x < x2 && d.y > m.y - m.top - GEOMETRY.labelBlock && d.y < m.y + m.half.h;
        expect(inside).toBe(false);
      }
    }
  });

  it("never uses an element a generation wears, so the legend's meanings hold", () => {
    const worn = new Set<string>(layout.motifs.map((m) => m.motif));
    for (const d of decor) expect(worn.has(d.kind)).toBe(false);
  });

  it('grows every sprig upward', () => {
    for (const d of decor) {
      const [start] = pathPoints(d.stub);
      for (const ln of d.lines) for (const [, y] of pathPoints(ln)) expect(y).toBeLessThanOrEqual(start[1]);
      expect(d.y).toBeLessThan(start[1]);
    }
  });

  it('draws each part of a sprig as its own line, so their overlaps read as joints', () => {
    for (const d of decor) expect(d.lines.join(' ')).toBe(d.stub);
  });

  it('works for the small seed tree', () => expect(() => decorate(layoutLife(seed))).not.toThrow());
});

