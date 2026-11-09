import { FamilyMember } from '@app/core/models';
import { buildHouseholds } from './households';
import { HouseholdForest } from './types';

/** The main tree, plus the family of the spouse it joined, standing behind it like a neighbouring tree. */
export interface ForestSplit {
  main: FamilyMember[];
  back: {
    members: FamilyMember[];
    /** The spouse who belongs to both trees (shown in each); clicking her dives into the back tree. */
    focusMemberId: string;
  } | null;
}

/**
 * When the main first-generation couple (the one with strictly the most descendants) joins a second
 * founder family, that family becomes its own tree behind the main one. The spouse appears in both:
 * married in the main tree, as a daughter in hers. Links crossing between the trees are cut.
 */
export function splitForest(members: FamilyMember[]): ForestSplit {
  const forest = buildHouseholds(members);
  const plan = backgroundFamily(forest);
  if (!plan) {
    return { main: members, back: null };
  }

  // the background family: its founders and every household below them, except the main couple's line
  const backHouseholds = new Set<string>();
  const stack = [plan.founders];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === plan.main || backHouseholds.has(id)) continue;
    backHouseholds.add(id);
    stack.push(...forest.households.get(id)!.childHouseholdIds);
  }
  const backIds = new Set([...backHouseholds].flatMap((h) => forest.households.get(h)!.memberIds));
  const founderIds = new Set(forest.households.get(plan.founders)!.memberIds);
  const focus = members.find(
    (m) => forest.households.get(plan.main)!.memberIds.includes(m.id) && m.rels.parents.some((p) => founderIds.has(p)),
  )!;

  const keep = (m: FamilyMember, allowed: Set<string>): FamilyMember => ({
    ...m,
    rels: {
      parents: m.rels.parents.filter((id) => allowed.has(id)),
      spouses: m.rels.spouses.filter((id) => allowed.has(id)),
      children: m.rels.children.filter((id) => allowed.has(id)),
    },
  });
  const mainIds = new Set(members.filter((m) => !backIds.has(m.id)).map((m) => m.id));
  const main = members.filter((m) => mainIds.has(m.id)).map((m) => keep(m, mainIds));
  const backAllowed = new Set([...backIds, focus.id]);
  const back = [
    ...members.filter((m) => backIds.has(m.id)).map((m) => keep(m, backAllowed)),
    { ...focus, rels: { parents: focus.rels.parents.filter((p) => founderIds.has(p)), spouses: [], children: [] } },
  ];
  return { main, back: { members: back, focusMemberId: focus.id } };
}

function backgroundFamily(forest: HouseholdForest): { main: string; founders: string } | null {
  const descendants = (id: string): number =>
    forest.households.get(id)!.childHouseholdIds.reduce((n, c) => n + 1 + descendants(c), 0);
  const firstRow = forest.rootIds.flatMap((r) => forest.households.get(r)!.childHouseholdIds);
  if (!firstRow.length) {
    return null;
  }
  const sizes = firstRow.map(descendants);
  const best = Math.max(...sizes);
  if (sizes.filter((n) => n === best).length !== 1) {
    return null;
  }
  const main = firstRow[sizes.indexOf(best)];
  const h = forest.households.get(main)!;
  const founders = h.graftParentHouseholdIds.find(
    (g) => g !== h.parentHouseholdId && (forest.rootIds.includes(g) || forest.graftRootIds.includes(g)),
  );
  return founders ? { main, founders } : null;
}
