import { splitForest } from './forest';
import { member } from './testing/member-factory';
import { SEED_MEMBERS } from './testing/seed-fixture';

// paternal 1+2 → 3 (married to 6, child 7), 10, 11 ; maternal 4+5 → 6, 12, 13
const families = [
  member('1', { spouses: ['2'], children: ['3', '10', '11'] }),
  member('2', { spouses: ['1'], children: ['3', '10', '11'] }),
  member('3', { parents: ['1', '2'], spouses: ['6'], children: ['7'] }),
  member('10', { parents: ['1', '2'] }),
  member('11', { parents: ['1', '2'] }),
  member('4', { spouses: ['5'], children: ['6', '12', '13'] }),
  member('5', { spouses: ['4'], children: ['6', '12', '13'] }),
  member('6', { parents: ['4', '5'], spouses: ['3'], children: ['7'] }),
  member('12', { parents: ['4', '5'] }),
  member('13', { parents: ['4', '5'] }),
  member('7', { parents: ['3', '6'] }),
];
const ids = (ms: { id: string }[]) => ms.map((m) => m.id).sort((a, b) => Number(a) - Number(b));

describe('splitForest', () => {
  const split = splitForest(families);

  it("keeps the main line's family as the main tree", () => {
    expect(ids(split.main)).toEqual(['1', '2', '3', '6', '7', '10', '11']);
  });

  it("moves the spouse's family to a tree standing behind, with her in it too", () => {
    expect(split.back).not.toBeNull();
    expect(split.back!.focusMemberId).toBe('6');
    expect(ids(split.back!.members)).toEqual(['4', '5', '6', '12', '13']);
  });

  it('cuts every link that would cross between the two trees', () => {
    const inMain = new Set(ids(split.main));
    for (const m of split.main) {
      for (const r of [...m.rels.parents, ...m.rels.spouses, ...m.rels.children]) expect(inMain.has(r)).toBe(true);
    }
    const her = split.back!.members.find((m) => m.id === '6')!;
    expect(her.rels).toEqual({ parents: ['4', '5'], spouses: [], children: [] });
    expect(split.main.find((m) => m.id === '6')!.rels.parents).toEqual([]);
  });

  it('leaves a single-family tree whole', () => {
    const s = splitForest(SEED_MEMBERS);
    expect(s.back).toBeNull();
    expect(s.main).toHaveLength(SEED_MEMBERS.length);
  });

  it('handles an empty family', () => expect(splitForest([])).toEqual({ main: [], back: null }));
});
