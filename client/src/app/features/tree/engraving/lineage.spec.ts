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
