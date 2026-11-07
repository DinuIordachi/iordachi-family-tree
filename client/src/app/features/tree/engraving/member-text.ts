import { FamilyMember } from '@app/core/models';

function year(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const y = new Date(value).getFullYear();
  return Number.isNaN(y) ? null : y;
}

/** "Ion Iordachi"; a lone first name is fine, a lone last name becomes "Unknown". */
export function fullName(m: FamilyMember): string {
  const first = m.data['first name']?.trim();
  if (!first) {
    return 'Unknown';
  }
  const last = m.data['last name']?.trim();
  return last ? `${first} ${last}` : first;
}

/** "1925 – 1998" for the deceased, "1955 –" for the living, "" when unknown. */
export function lifespan(m: FamilyMember): string {
  const born = year(m.data.birthday);
  if (born === null) {
    return '';
  }
  const died = year(m.diedAt);
  return died === null ? `${born} –` : `${born} – ${died}`;
}

/** "Vasile Iordachi, born 1925, died 1998". */
export function memberAriaLabel(m: FamilyMember): string {
  const parts = [fullName(m)];
  const born = year(m.data.birthday);
  const died = year(m.diedAt);
  if (born !== null) {
    parts.push(`born ${born}`);
  }
  if (died !== null) {
    parts.push(`died ${died}`);
  }
  return parts.join(', ');
}
