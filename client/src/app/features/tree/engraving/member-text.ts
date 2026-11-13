import { BANNER_SCALE } from './medallion-geometry';
import { FamilyMember } from '@app/core/models';

/**
 * Year as written in the ISO date string. Not `new Date(...).getFullYear()`: a date-only
 * string parses as UTC midnight and reads back a year early west of Greenwich.
 */
function year(value: string | null | undefined): number | null {
  const match = value?.match(/^(\d{4})-\d{2}-\d{2}/);
  return match && !Number.isNaN(Date.parse(value!)) ? Number(match[1]) : null;
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

/** "1925 – 1998" for the deceased, "1955 –" for the living, "† 2024" when only the death year is known, "" when unknown. */
export function lifespan(m: FamilyMember): string {
  const born = year(m.data.birthday);
  const died = year(m.diedAt);
  if (born === null) {
    return died !== null ? `† ${died}` : m.deceased ? '†' : '';
  }
  if (died === null && m.deceased) {
    return `${born} – †`;
  }
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
  } else if (m.deceased) {
    parts.push('deceased');
  }
  return parts.join(', ');
}

/** Estimated width of a name's ribbon banner: band (min 120, ≈8 units per glyph + 28 padding) plus both 16-unit swallow tails. */
export function bannerSpan(name: string): number {
  return (Math.max(120, name.length * 8 + 28) + 32) * BANNER_SCALE;
}
