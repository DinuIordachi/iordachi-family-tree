import { hashSeed, seededRandom } from './seeded-random';

describe('seededRandom', () => {
  it('is deterministic per seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('differs between seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });

  it('stays in [0,1)', () => {
    const r = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('differs by input', () => expect(hashSeed('1')).not.toBe(hashSeed('2')));
  it('is stable', () => expect(hashSeed('a', 'b')).toBe(hashSeed('a', 'b')));
  it('separates parts', () => expect(hashSeed('ab', 'c')).not.toBe(hashSeed('a', 'bc')));
});
