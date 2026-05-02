/**
 * One file attached to a family member's media gallery
 * (additional photos, videos or audio — not the chart thumbnail).
 */
export interface FamilyMemberMedia {
  id: number;
  name: string;
  fileName: string;
  mime: string;
  size: number;
  url: string;
  collection: string;
  createdAt: string;
}

/**
 * Single family member returned by the backend.
 *
 * The `id`/`data`/`rels` triple is the family-chart `Datum` shape
 * (the library reads only those three keys and ignores the rest).
 * The remaining fields are back-office concerns.
 */
export interface FamilyMember {
  id: string;
  data: {
    'first name': string;
    'last name'?: string;
    birthday?: string;
    gender?: 'M' | 'F';
    avatar?: string;
    /** Mirrored on `data` so family-chart's post-render hook can flag cards. */
    deceased?: boolean;
  };
  rels: {
    parents: string[];
    spouses: string[];
    children: string[];
  };
  biography: string | null;
  /** ISO-8601 datetime; null while alive. */
  diedAt: string | null;
  /** Convenience boolean — true iff `diedAt` is set. */
  deceased: boolean;
  thumbnailUrl: string | null;
  media: FamilyMemberMedia[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  can: {
    view: boolean;
    update: boolean;
    delete: boolean;
    forceDelete: boolean;
  };
}

/**
 * Payload sent on create/update. The base form request converts
 * camelCase keys to snake_case server-side.
 */
export interface FamilyMemberPayload {
  firstName: string;
  lastName?: string | null;
  birthdate?: string | null;
  /** ISO-8601 datetime string, optional. */
  diedAt?: string | null;
  gender?: 'M' | 'F' | null;
  biography?: string | null;
  parentIds?: number[];
  spouseIds?: number[];
  childIds?: number[];
}
