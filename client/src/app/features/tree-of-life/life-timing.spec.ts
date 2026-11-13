import { GROW_STEP, bondDelay, branchDelay, memberDelay, sprigDelay } from './life-timing';

describe('life timing', () => {
  it('grows each generation one step after the one below it', () => {
    for (const delay of [branchDelay, bondDelay, memberDelay]) {
      expect(delay(1) - delay(0)).toBe(GROW_STEP);
      expect(delay(3) - delay(2)).toBe(GROW_STEP);
    }
  });

  it('grows a marriage bond together with the branches leaving it', () => {
    for (const gen of [0, 1, 2, 3]) expect(bondDelay(gen)).toBe(branchDelay(gen));
  });

  it('never starts a bond at load: it waits like every other line', () => {
    expect(bondDelay(0)).toBeGreaterThan(0);
  });

  it('starts a bond before its couple blooms', () => {
    for (const gen of [0, 1, 2, 3]) expect(bondDelay(gen)).toBeLessThan(memberDelay(gen));
  });

  it('staggers sprigs after the tree', () => {
    expect(sprigDelay(1) - sprigDelay(0)).toBe(60);
  });
});
