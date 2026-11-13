import { TWIG_TIP, branchWidths, woodWidth } from './branch-geometry';

describe('woodWidth', () => {
  it('thickens with the people the wood carries, by the square root (pipe model)', () => {
    expect(woodWidth(9) - woodWidth(4)).toBeCloseTo(woodWidth(4) - woodWidth(1), 6); // √9 − √4 = √4 − √1
    expect(woodWidth(45)).toBeGreaterThan(4 * woodWidth(1));
  });

  it('makes every fork thinner than the wood it grows from', () => {
    for (const [parent, child] of [[2, 1], [9, 4], [45, 12]]) {
      expect(woodWidth(child)).toBeLessThan(woodWidth(parent));
    }
  });
});

describe('branchWidths', () => {
  it('starts as thick as what the branch carries and ends in a twig tip', () => {
    expect(branchWidths(3, 6)).toEqual({ start: woodWidth(6), end: TWIG_TIP });
  });

  it('a limb carrying few people is thinner than one carrying many', () => {
    expect(branchWidths(1, 2).start).toBeLessThan(branchWidths(1, 7).start);
  });
});
