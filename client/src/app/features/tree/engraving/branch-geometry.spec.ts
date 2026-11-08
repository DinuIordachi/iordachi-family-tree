import { branchWidths } from './branch-geometry';

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
