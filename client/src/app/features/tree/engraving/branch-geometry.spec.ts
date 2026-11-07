import { branchPath, branchWidths, rootsPath, trunkPath } from './branch-geometry';
import { BranchSegment } from './types';

const seg = (over: Partial<BranchSegment> = {}): BranchSegment => ({
  id: '1+2>3+4',
  parentHouseholdId: '1+2',
  childHouseholdId: '3+4',
  from: { x: 0, y: -220 },
  to: { x: 200, y: -410 },
  generation: 1,
  ...over,
});

const firstPoint = (d: string) => {
  const [x, y] = d.slice(1).trim().split(/[\s,]+/).map(Number);
  return { x, y };
};

describe('branchWidths', () => {
  it('starts thick near the trunk', () => {
    const w = branchWidths(0);
    expect(w.start).toBe(28);
    expect(w.end).toBeCloseTo(9.8);
  });
  it('bottoms out in the crown', () => {
    const w = branchWidths(9);
    expect(w.start).toBe(6);
    expect(w.end).toBeCloseTo(2.1);
  });
  it('never goes below 2 at the tip', () => expect(branchWidths(50).end).toBeGreaterThanOrEqual(2));
});

describe('branchPath', () => {
  it('is a closed outline without NaN', () => {
    const d = branchPath(seg());
    expect(d.startsWith('M')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
    expect(d).not.toContain('NaN');
  });
  it('is deterministic for the same id', () => expect(branchPath(seg())).toBe(branchPath(seg())));
  it('starts at the parent end', () => {
    const p = firstPoint(branchPath(seg()));
    const start = branchWidths(1).start;
    expect(Math.hypot(p.x - 0, p.y - -220)).toBeLessThanOrEqual(start / 2 + 1);
  });
  it('jitters by id', () => expect(branchPath(seg({ id: 'other' }))).not.toBe(branchPath(seg())));
  it('tapers a leaf branch to the spec tip width', () => expect(branchPath(seg())).toContain('A4.2 4.2 ')); // 24 × 0.35 / 2

  it('ends at a given width so forks continue without a step', () => {
    const d = branchPath(seg(), branchWidths(2).start);
    expect(d).toContain(`A${branchWidths(2).start / 2} ${branchWidths(2).start / 2} `);
  });

  it('survives a zero-length segment', () => {
    const d = branchPath(seg({ to: { x: 0, y: -220 } }));
    expect(d).not.toContain('NaN');
    expect(d.trim().endsWith('Z')).toBe(true);
  });
});

describe('trunkPath / rootsPath', () => {
  const trunk = { base: { x: 0, y: 0 }, top: { x: 0, y: -220 } };
  it('trunk has no NaN and is closed', () => {
    const d = trunkPath(trunk);
    expect(d).not.toContain('NaN');
    expect(d.trim().endsWith('Z')).toBe(true);
  });
  it('trunk narrows to the first branch width at the top, with no flat cap', () => {
    const d = trunkPath(trunk);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
    const nearTop = pts.filter((p) => p.y <= trunk.top.y + 1);
    expect(nearTop.length).toBeGreaterThan(0);
    for (const p of nearTop) {
      expect(Math.abs(p.x - trunk.top.x)).toBeLessThanOrEqual(branchWidths(0).start / 2);
    }
    expect(d).not.toMatch(/L-?[\d.]+ -220\b/);
  });

  it('trunk is 90 wide at the base', () => {
    const xs = trunkPath(trunk).match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(90);
  });
  it('roots have no NaN, 5-7 subpaths, and stay within 140 + width either side', () => {
    const d = rootsPath({ x: 0, y: 0 }, 42);
    expect(d).not.toContain('NaN');
    const count = (d.match(/M/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
    const xs = d.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0);
    expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(160);
  });
  it('roots are deterministic per seed', () => expect(rootsPath({ x: 0, y: 0 }, 1)).toBe(rootsPath({ x: 0, y: 0 }, 1)));
});
