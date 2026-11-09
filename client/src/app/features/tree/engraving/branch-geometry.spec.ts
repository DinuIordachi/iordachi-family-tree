import { branchWidths } from './branch-geometry';

describe('branchWidths', () => {
  it('starts thick near the trunk', () => {
    const w = branchWidths(0);
    expect(w.start).toBe(28);
    expect(w.end).toBeCloseTo(7);
  });
  it('bottoms out in the crown', () => {
    const w = branchWidths(9);
    expect(w.start).toBe(6);
    expect(w.end).toBeCloseTo(2);
  });
  it('a limb carrying few people is thinner than the main line of the same generation', () => {
    expect(branchWidths(1, 2).start).toBeLessThan(branchWidths(1, 7).start);
    expect(branchWidths(1, 50).start).toBe(branchWidths(1).start);
  });
  it('never goes below 2 at the tip', () => expect(branchWidths(50).end).toBeGreaterThanOrEqual(2));
});
