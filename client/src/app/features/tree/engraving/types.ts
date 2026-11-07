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
}

export interface HouseholdForest {
  households: Map<string, Household>;
  /** Founder households (have >=1 descendant), or the single household if it is the whole tree. */
  rootIds: string[];
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
}

export interface TreeLayout {
  members: PlacedMember[];
  branches: BranchSegment[];
  trunk: { base: Point; top: Point };
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
