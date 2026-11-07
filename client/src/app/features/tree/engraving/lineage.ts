import { TreeLayout } from './types';

/** Branch ids from a member's household down to the trunk, nearest first. */
export function lineageBranchIds(memberId: string, layout: TreeLayout): string[] {
  const placed = layout.members.find((m) => m.id === memberId);
  if (!placed) {
    return [];
  }
  const byChild = new Map(layout.branches.map((b) => [b.childHouseholdId, b]));
  const ids: string[] = [];
  let branch = byChild.get(placed.householdId);
  while (branch) {
    ids.push(branch.id);
    branch = branch.parentHouseholdId ? byChild.get(branch.parentHouseholdId) : undefined;
  }
  return ids;
}
