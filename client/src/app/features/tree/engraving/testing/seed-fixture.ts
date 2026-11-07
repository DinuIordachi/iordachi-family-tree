import { member } from './member-factory';

/** Mirrors FamilyMemberSeeder: 1+2 → 3; 3+4 → 5,7; 5+6 → 8,9. */
export const SEED_MEMBERS = [
  member('1', { spouses: ['2'], children: ['3'] }),
  member('2', { spouses: ['1'], children: ['3'] }),
  member('3', { parents: ['1', '2'], spouses: ['4'], children: ['5', '7'] }),
  member('4', { spouses: ['3'], children: ['5', '7'] }),
  member('5', { parents: ['3', '4'], spouses: ['6'], children: ['8', '9'] }),
  member('6', { spouses: ['5'], children: ['8', '9'] }),
  member('7', { parents: ['3', '4'] }),
  member('8', { parents: ['5', '6'] }),
  member('9', { parents: ['5', '6'] }),
];
