import { FamilyMember } from '@app/core/models';

/** Test builder for a FamilyMember with sensible defaults. */
export function member(
  id: string,
  rels: Partial<FamilyMember['rels']> = {},
  data: Partial<FamilyMember['data']> & { diedAt?: string | null } = {},
): FamilyMember {
  const { diedAt = null, ...rest } = data;
  const deceased = !!diedAt;
  return {
    id,
    data: { 'first name': 'P' + id, gender: 'M', ...rest, deceased },
    rels: { parents: [], spouses: [], children: [], ...rels },
    biography: null,
    diedAt,
    deceased,
    thumbnailUrl: null,
    media: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    can: { view: true, update: false, delete: false, forceDelete: false },
  };
}
