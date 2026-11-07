import { FamilyMember } from '@app/core/models';
import { Household, HouseholdForest } from './types';

const byNumericId = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b);

/**
 * Groups members into households (a person plus their spouses) and links
 * each household to the household its parents belong to. See spec §4.
 */
export function buildHouseholds(members: FamilyMember[]): HouseholdForest {
  const byId = new Map(members.map((m) => [m.id, m]));
  const knownParents = (m: FamilyMember) => m.rels.parents.filter((p) => byId.has(p));

  // 1. Spouse groups: connected components over rels.spouses.
  const householdOf = new Map<string, string>();
  const households = new Map<string, Household>();
  for (const start of [...byId.keys()].sort(byNumericId)) {
    if (householdOf.has(start)) {
      continue;
    }
    const group: string[] = [];
    const stack = [start];
    const seen = new Set([start]);
    while (stack.length) {
      const id = stack.pop()!;
      group.push(id);
      for (const s of byId.get(id)!.rels.spouses) {
        if (byId.has(s) && !seen.has(s)) {
          seen.add(s);
          stack.push(s);
        }
      }
    }
    const sorted = [...group].sort(byNumericId);
    const id = sorted.join('+');
    const blood = (m: string) => (knownParents(byId.get(m)!).length > 0 ? 0 : 1);
    const memberIds = [...sorted].sort((a, b) => blood(a) - blood(b) || byNumericId(a, b));
    households.set(id, { id, memberIds, parentHouseholdId: null, childHouseholdIds: [] });
    sorted.forEach((m) => householdOf.set(m, id));
  }

  // 2. Parent household: that of the lowest-id member with known parents.
  for (const h of households.values()) {
    const anchor = [...h.memberIds].sort(byNumericId).find((m) => knownParents(byId.get(m)!).length > 0);
    if (!anchor) {
      continue;
    }
    const parentHousehold = householdOf.get(knownParents(byId.get(anchor)!)[0])!;
    if (parentHousehold !== h.id) {
      h.parentHouseholdId = parentHousehold;
      households.get(parentHousehold)!.childHouseholdIds.push(h.id);
    }
  }

  // 3. Children ordered by eldest member birthday, then id.
  const eldest = (h: Household) =>
    h.memberIds
      .map((m) => byId.get(m)!.data.birthday)
      .filter((b): b is string => !!b && !Number.isNaN(Date.parse(b)))
      .sort()[0] ?? '￿';
  const firstId = (h: Household) => [...h.memberIds].sort(byNumericId)[0];
  for (const h of households.values()) {
    h.childHouseholdIds.sort((a, b) => {
      const ha = households.get(a)!;
      const hb = households.get(b)!;
      return eldest(ha).localeCompare(eldest(hb)) || byNumericId(firstId(ha), firstId(hb));
    });
  }

  // 4. Roots: parentless with descendants, or the sole household.
  const parentless = [...households.values()].filter((h) => h.parentHouseholdId === null);
  const rootIds =
    households.size === 1
      ? [...households.keys()]
      : parentless.filter((h) => h.childHouseholdIds.length > 0).map((h) => h.id);
  rootIds.sort((a, b) => byNumericId(firstId(households.get(a)!), firstId(households.get(b)!)));

  // 5. Walk from roots; anything unreached (isolated, cyclic) is unplaced and detached.
  const reached = new Set<string>();
  const stack = [...rootIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (reached.has(id)) {
      continue;
    }
    reached.add(id);
    stack.push(...households.get(id)!.childHouseholdIds);
  }
  const unplacedMemberIds: string[] = [];
  for (const h of [...households.values()]) {
    if (!reached.has(h.id)) {
      unplacedMemberIds.push(...h.memberIds);
      households.delete(h.id);
    }
  }
  for (const h of households.values()) {
    h.childHouseholdIds = h.childHouseholdIds.filter((c) => households.has(c));
  }
  unplacedMemberIds.sort(byNumericId);

  return { households, rootIds, unplacedMemberIds };
}
