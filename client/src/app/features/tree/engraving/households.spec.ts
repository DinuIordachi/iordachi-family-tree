import { buildHouseholds } from './households';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';

describe('buildHouseholds', () => {
  it('groups spouses and chains generations', () => {
    const f = buildHouseholds(seed);
    expect(f.rootIds).toEqual(['1+2']);
    expect(f.households.get('1+2')!.childHouseholdIds).toEqual(['3+4']);
    expect(f.households.get('3+4')!.childHouseholdIds).toEqual(['5+6', '7']);
    expect(f.households.get('5+6')!.memberIds).toEqual(['5', '6']);
    expect(f.households.get('5+6')!.parentHouseholdId).toBe('3+4');
    expect(f.unplacedMemberIds).toEqual([]);
  });

  it('lists the blood member first in a household', () => {
    // 4 married in (no parents); 3 is blood
    const f = buildHouseholds([member('4', { spouses: ['3'] }), member('3', { spouses: ['4'] }), ...seed.slice(0, 2)].map(
      (m) => (m.id === '3' ? { ...m, rels: { ...m.rels, parents: ['1', '2'] } } : m),
    ));
    expect(f.households.get('3+4')!.memberIds).toEqual(['3', '4']);
  });

  it('orders children by eldest birthday, then id', () => {
    const f = buildHouseholds([
      member('1', { children: ['2', '3'] }),
      member('2', { parents: ['1'] }, { birthday: '1990-01-01' }),
      member('3', { parents: ['1'] }, { birthday: '1980-01-01' }),
    ]);
    expect(f.households.get('1')!.childHouseholdIds).toEqual(['3', '2']);
  });

  it('places a household once when both spouses have parents in the tree', () => {
    const f = buildHouseholds([
      member('1', { spouses: ['2'], children: ['3'] }),
      member('2', { spouses: ['1'], children: ['3'] }),
      member('3', { parents: ['1', '2'], spouses: ['12'] }),
      member('10', { spouses: ['11'], children: ['12'] }),
      member('11', { spouses: ['10'], children: ['12'] }),
      member('12', { parents: ['10', '11'], spouses: ['3'] }),
    ]);
    const all = [...f.households.values()].flatMap((h) => h.childHouseholdIds);
    expect(all.filter((id) => id === '3+12')).toHaveLength(1);
    expect(f.households.get('3+12')!.parentHouseholdId).toBe('1+2');
    expect(f.households.get('3+12')!.memberIds).toEqual(['3', '12']);
    expect(f.rootIds).toEqual(['1+2']);
  });

  it('ignores parent ids missing from the data', () => {
    const f = buildHouseholds([...seed, member('20', { parents: ['404'] })]);
    expect(f.unplacedMemberIds).toEqual(['20']);
  });

  it('terminates on cycles and parks the cyclic members', () => {
    const f = buildHouseholds([member('1', { parents: ['2'], children: ['2'] }), member('2', { parents: ['1'], children: ['1'] })]);
    expect([...f.unplacedMemberIds].sort()).toEqual(['1', '2']);
    expect(f.rootIds).toEqual([]);
  });

  it('parks isolated members when a real tree exists', () => {
    expect(buildHouseholds([...seed, member('99')]).unplacedMemberIds).toEqual(['99']);
  });

  it('keeps several founder households as roots', () => {
    const f = buildHouseholds([member('1', { children: ['2'] }), member('2', { parents: ['1'] }), member('5', { children: ['6'] }), member('6', { parents: ['5'] })]);
    expect(f.rootIds).toEqual(['1', '5']);
  });

  it('treats a single person as the whole tree', () => expect(buildHouseholds([member('1')]).rootIds).toEqual(['1']));

  it('handles empty input', () => {
    const f = buildHouseholds([]);
    expect(f.rootIds).toEqual([]);
    expect(f.unplacedMemberIds).toEqual([]);
  });
});
