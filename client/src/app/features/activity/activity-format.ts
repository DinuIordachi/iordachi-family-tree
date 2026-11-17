import { Activity } from '@app/core/models';
import { AppTagSeverity } from '@app/shared/components';

/** "relationships-updated" → "Relationships updated", "viewAny-users" → "View any users". */
export function humanize(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const words = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function eventSeverity(event: string | null | undefined): AppTagSeverity {
  const e = (event ?? '').toLowerCase();
  if (e.includes('force') || e.includes('delete')) return 'danger';
  if (e === 'created' || e.startsWith('create') || e.includes('invite')) return 'success';
  if (e === 'updated' || e.includes('update') || e.includes('change') || e.includes('restored')) return 'info';
  if (e === 'login' || e === 'logout') return 'contrast';
  return 'secondary';
}

export function causerName(activity: Activity): string {
  const c = activity.causer;
  if (!c) return 'System';
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email;
}

/** Display a before/after value: empty → "—", objects → JSON. */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Properties other than the old/new change sets (e.g. remember, ip). */
export function extraProperties(activity: Activity): { key: string; value: string }[] {
  return Object.entries(activity.properties ?? {})
    .filter(([key]) => key !== 'old' && key !== 'attributes')
    .map(([key, value]) => ({ key: humanize(key), value: displayValue(value) }));
}

/** Local date → "YYYY-MM-DD". */
export function toIsoDate(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → local Date (or null). */
export function fromIsoDate(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
