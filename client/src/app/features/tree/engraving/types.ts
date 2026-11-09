export interface Point {
  x: number;
  y: number;
}

export interface Household {
  /** Sorted member ids joined by '+', e.g. "3+4". */
  id: string;
  /** Ordered: blood member(s) first, then spouses; ties by numeric id. */
  memberIds: string[];
  parentHouseholdId: string | null;
  /** Ordered by eldest member birthday, then id. */
  childHouseholdIds: string[];
  /** Parent households of the other spouse(s): a second ancestor line joining this couple. */
  graftParentHouseholdIds: string[];
  /** Couples this household is a grafted ancestor line of. */
  graftChildHouseholdIds: string[];
}

export interface HouseholdForest {
  households: Map<string, Household>;
  /** Founder households (have >=1 descendant), or the single household if it is the whole tree. */
  rootIds: string[];
  /** Parentless couples linked only as a spouse's parents (e.g. maternal grandparents). */
  graftRootIds: string[];
  /** Isolated / cyclic members → "Alii" cartouche. */
  unplacedMemberIds: string[];
}

export interface PlacedMember {
  id: string;
  householdId: string;
  center: Point;
  generation: number;
}

export interface BranchSegment {
  /** `${parentHouseholdId ?? 'trunk'}>${childHouseholdId}` */
  id: string;
  parentHouseholdId: string | null;
  childHouseholdId: string;
  from: Point;
  to: Point;
  /** Generation of the child household. */
  generation: number;
  /** A second ancestor line joining a couple (e.g. a spouse's parents), not the main line. */
  graft?: boolean;
  /** People this limb carries: the child household and everyone descending from it (sets its thickness). */
  weight?: number;
  /** How far the limb climbs straight up before spreading, to clear the portraits it grows out of. */
  rise?: number;
}

export interface TreeLayout {
  members: PlacedMember[];
  branches: BranchSegment[];
  /** Where the composition is anchored (the trunk, or where two trees meet). */
  trunk: { base: Point; top: Point };
  /** Every trunk to draw: one for a single tree, two when two family trees merge. */
  trunks: Array<{ base: Point; top: Point }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  generationCount: number;
  unplacedMemberIds: string[];
}

export type MotifId =
  | 'stefan-cel-mare'
  | 'molda-hound'
  | 'aurochs-shield'
  | 'eagle-cross'
  | 'river-moldova'
  | 'grapevine'
  | 'perched-falcon'
  | 'star-rose-crescent'
  | 'oak-sprig'
  | 'putna-church';

export interface MotifPlacement {
  motif: MotifId;
  center: Point;
  scale: number;
  mirrored: boolean;
}
