import { buildHouseholds } from './households';
import { layoutTree } from './layout';
import { lineageBranchIds } from './lineage';
import { member } from './testing/member-factory';
import { SEED_MEMBERS as seed } from './testing/seed-fixture';

describe('lineageBranchIds', () => {
  const layout = layoutTree(buildHouseholds([...seed, member('99')]));

  it('walks from a member down to the trunk', () =>
    expect(lineageBranchIds('8', layout)).toEqual(['5+6>8', '3+4>5+6', '1+2>3+4', 'trunk>1+2']));

  it('includes the household a spouse married into', () =>
    expect(lineageBranchIds('6', layout)).toEqual(['3+4>5+6', '1+2>3+4', 'trunk>1+2']));

  it('is just the trunk link for a founder', () => expect(lineageBranchIds('2', layout)).toEqual(['trunk>1+2']));

  it('is empty for unplaced or unknown members', () => {
    expect(lineageBranchIds('99', layout)).toEqual([]);
    expect(lineageBranchIds('404', layout)).toEqual([]);
  });
});

describe('lineageBranchIds with a grafted ancestor line', () => {
  it('follows the main line down to the trunk, not the grafted one', () => {
    const l = layoutTree(
      buildHouseholds([
        member('1', { spouses: ['2'], children: ['3'] }),
        member('2', { spouses: ['1'], children: ['3'] }),
        member('3', { parents: ['1', '2'], spouses: ['6'], children: ['7'] }),
        member('4', { spouses: ['5'], children: ['6'] }),
        member('5', { spouses: ['4'], children: ['6'] }),
        member('6', { parents: ['4', '5'], spouses: ['3'], children: ['7'] }),
        member('7', { parents: ['3', '6'] }),
      ]),
    );
    expect(lineageBranchIds('7', l)).toEqual(['3+6>7', '1+2>3+6', 'trunk>1+2']);
    expect(lineageBranchIds('4', l)).toEqual(['trunk>4+5']);
  });
});
